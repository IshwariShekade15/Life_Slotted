import os
import logging
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import Client, create_client
from dotenv import load_dotenv

from app.scheduler import Block, Window, schedule_detailed

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

logger = logging.getLogger("slotted.api")
app = FastAPI(title="Slotted API", version="0.2.0")
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.exception_handler(Exception)
async def unhandled_exception(request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled API error", extra={"path": request.url.path, "method": request.method})
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})


def get_admin_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="The service is temporarily unavailable.")
    return create_client(url, key)


def require_user(
    authorization: str | None = Header(default=None),
    supabase: Client = Depends(get_admin_client),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="A bearer token is required")
    token = authorization.removeprefix("Bearer ").strip()
    if len(token) < 10:
        raise HTTPException(status_code=401, detail="A valid bearer token is required")
    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="The Supabase session is invalid")
    if not response.user:
        raise HTTPException(status_code=401, detail="The Supabase session is invalid")
    return {"id": str(response.user.id), "email": response.user.email}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def parse_time(value: str) -> time:
    return time.fromisoformat(value[:8])


def build_windows(rows: list[dict], start: date, days: int = 14) -> list[Window]:
    by_day = {
        int(row["day_of_week"]): (parse_time(row["start_time"]), parse_time(row["end_time"]))
        for row in rows
    }
    if not by_day:
        by_day = {day: (time(9), time(17)) for day in range(5)}
    return [
        Window(current, *by_day[current.weekday()])
        for offset in range(days)
        if (current := start + timedelta(days=offset)).weekday() in by_day
    ]


def load_busy(supabase: Client, user_id: str, start: date, end: date) -> list[Block]:
    meeting_rows = (
        supabase.table("meeting_blocks")
        .select("date,start_time,end_time")
        .eq("user_id", user_id)
        .eq("status", "active")
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .execute()
        .data
    )
    task_rows = (
        supabase.table("scheduled_blocks")
        .select("date,start_time,end_time")
        .eq("user_id", user_id)
        .in_("status", ["upcoming", "completed"])
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .execute()
        .data
    )
    return [
        Block(date.fromisoformat(row["date"]), parse_time(row["start_time"]), parse_time(row["end_time"]))
        for row in [*meeting_rows, *task_rows]
    ]


class ScheduleTask(BaseModel):
    id: str
    duration_minutes: int = Field(gt=0)
    priority: Literal["high", "medium", "low"] = "medium"
    deadline: datetime | None = None
    divisible: bool = False
    min_block_minutes: int = Field(default=15, gt=0)
    recurrence: Literal["none", "daily", "weekdays", "custom_days", "n_times_per_week"] = "none"
    recurrence_days: list[int] | None = None
    recurrence_n: int | None = None
    recurrence_end_date: date | None = None


class ScheduleRequest(BaseModel):
    tasks: list[ScheduleTask] = Field(min_length=1)


def expand_recurring(tasks: list[dict], start: date, end: date) -> list[dict]:
    expanded: list[dict] = []
    for task in tasks:
        recurrence = task.get("recurrence", "none")
        if recurrence == "none":
            expanded.append(task)
            continue
        until = min(end, task.get("recurrence_end_date") or end)
        for offset in range((until - start).days + 1):
            occurrence = start + timedelta(days=offset)
            weekday = occurrence.weekday()
            include = (
                recurrence == "daily"
                or recurrence == "weekdays" and weekday < 5
                or recurrence == "custom_days" and weekday in (task.get("recurrence_days") or [])
                or recurrence == "n_times_per_week" and weekday < (task.get("recurrence_n") or 1)
            )
            if include:
                copy = dict(task)
                copy["deadline"] = task.get("deadline")
                expanded.append(copy)
    return expanded


@app.get("/availability")
def get_availability(user: dict = Depends(require_user)) -> list[dict]:
    return get_admin_client().table("user_availability").select("*").eq("user_id", user["id"]).order("day_of_week").execute().data


@app.get("/schedule/today")
def get_today_schedule(user: dict = Depends(require_user)) -> dict:
    supabase = get_admin_client()
    today = date.today()
    rows = supabase.table("user_availability").select("*").eq("user_id", user["id"]).execute().data
    windows = build_windows(rows, today, 1)
    busy = load_busy(supabase, user["id"], today, today)
    scheduled = [
        {"date": block.day.isoformat(), "start_time": block.start.isoformat(), "end_time": block.end.isoformat()}
        for block in busy
        if block.day == today
    ]
    total = sum((datetime.combine(window.day, window.end) - datetime.combine(window.day, window.start)).seconds // 60 for window in windows)
    occupied = sum((datetime.combine(block.day, block.end) - datetime.combine(block.day, block.start)).seconds // 60 for block in busy)
    return {"blocks": scheduled, "meetings": [], "capacity": {"total_available_minutes": total, "total_meeting_minutes": occupied, "total_scheduled_minutes": occupied, "free_minutes": max(0, total - occupied)}}


@app.post("/schedule/preview")
def preview_schedule(payload: ScheduleRequest, user: dict = Depends(require_user)) -> dict:
    supabase = get_admin_client()
    start = date.today()
    end = start + timedelta(days=89)
    availability = supabase.table("user_availability").select("*").eq("user_id", user["id"]).execute().data
    windows = build_windows(availability, start, 90)
    busy = load_busy(supabase, user["id"], start, end)
    placements, capacity, at_risk = schedule_detailed(
        expand_recurring([task.model_dump() for task in payload.tasks], start, end),
        windows,
        busy,
        datetime.now().astimezone(),
    )
    return {
        "blocks": [
            {"task_id": task_id, "date": block.day.isoformat(), "start_time": block.start.isoformat(), "end_time": block.end.isoformat(), "is_subpart": is_subpart}
            for task_id, block, is_subpart in placements
        ],
        "capacity": capacity,
        "at_risk": sorted(at_risk),
    }


@app.post("/schedule/rebalance")
def rebalance_schedule(user: dict = Depends(require_user)) -> dict:
    """Rebuild upcoming task blocks without moving meetings or completed work."""
    supabase = get_admin_client()
    start = date.today()
    end = start + timedelta(days=89)
    pending = (
        supabase.table("tasks")
        .select("id,duration_minutes,priority,deadline,divisible,min_block_minutes,recurrence,recurrence_days,recurrence_n,recurrence_end_date")
        .eq("user_id", user["id"])
        .in_("status", ["pending", "scheduled"])
        .execute()
        .data
    )
    supabase.table("scheduled_blocks").delete().eq("user_id", user["id"]).eq("status", "upcoming").execute()
    availability = supabase.table("user_availability").select("*").eq("user_id", user["id"]).execute().data
    windows = build_windows(availability, start, 90)
    busy = load_busy(supabase, user["id"], start, end)
    placements, capacity, at_risk = schedule_detailed(expand_recurring(pending, start, end), windows, busy, datetime.now().astimezone())
    if placements:
        supabase.table("scheduled_blocks").insert([
            {
                "task_id": task_id,
                "user_id": user["id"],
                "date": block.day.isoformat(),
                "start_time": block.start.isoformat(),
                "end_time": block.end.isoformat(),
                "is_subpart": is_subpart,
            }
            for task_id, block, is_subpart in placements
        ]).execute()
    scheduled_ids = {task_id for task_id, _, _ in placements}
    for task in pending:
        status = "scheduled" if str(task["id"]) in scheduled_ids else "pending"
        supabase.table("tasks").update({"status": status}).eq("id", task["id"]).eq("user_id", user["id"]).execute()
    return {"blocks_created": len(placements), "capacity": capacity, "at_risk": sorted(at_risk)}

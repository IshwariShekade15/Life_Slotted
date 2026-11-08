"""Deterministic, stateless scheduling primitives.

Database access and side effects belong in the API/service layer; this module
only transforms supplied data into placements and capacity statistics.
"""
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Iterable

PRIORITY_SCORE = {"high": 100, "medium": 60, "low": 30}

@dataclass(frozen=True)
class Window:
    day: date
    start: time
    end: time

@dataclass(frozen=True)
class Block:
    day: date
    start: time
    end: time

def _minutes(value: time) -> int:
    return value.hour * 60 + value.minute

def _time(value: int) -> time:
    return time(value // 60, value % 60)

def effective_priority(priority: str, deadline: datetime | None, now: datetime) -> int:
    score = PRIORITY_SCORE[priority]
    if deadline is None:
        return score
    hours = (deadline - now).total_seconds() / 3600
    boost = 80 if hours < 24 else 50 if hours < 48 else 30 if hours < 72 else 10 if hours < 168 else 0
    return score + boost

def subtract_busy(window: Window, busy: Iterable[Block]) -> list[tuple[int, int]]:
    free = [(_minutes(window.start), _minutes(window.end))]
    for block in sorted((b for b in busy if b.day == window.day), key=lambda b: _minutes(b.start)):
        start, end = _minutes(block.start), _minutes(block.end)
        next_free: list[tuple[int, int]] = []
        for left, right in free:
            if end <= left or start >= right:
                next_free.append((left, right))
            else:
                if left < start:
                    next_free.append((left, start))
                if end < right:
                    next_free.append((end, right))
        free = next_free
    return free

def schedule(
    tasks: list[dict],
    windows: list[Window],
    meetings: list[Block],
    now: datetime,
) -> tuple[list[Block], dict[str, int], set[str]]:
    """Place tasks greedily into earliest valid openings without overlap."""
    free_by_day = {w.day: subtract_busy(w, meetings) for w in windows}
    available = sum(right - left for slots in free_by_day.values() for left, right in slots)
    placements: list[Block] = []
    at_risk: set[str] = set()
    ordered = sorted(tasks, key=lambda task: (-effective_priority(task["priority"], task.get("deadline"), now), task.get("deadline") or datetime.max))
    for task in ordered:
        remaining = task["duration_minutes"]
        deadline = task.get("deadline")
        placed: list[Block] = []
        for day in sorted(free_by_day):
            if deadline is not None and day > deadline.date():
                continue
            for left, right in list(free_by_day[day]):
                original_right = right
                if deadline is not None and day == deadline.date():
                    right = min(right, _minutes(deadline.time()))
                if right - left >= remaining:
                    block = Block(day, _time(left), _time(left + remaining))
                    placed.append(block)
                    free_by_day[day].remove((left, original_right))
                    if left + remaining < original_right:
                        free_by_day[day].append((left + remaining, original_right))
                    break
            if placed:
                break
        if not placed and task.get("divisible"):
            chunk = task["min_block_minutes"]
            while remaining > 0:
                found = False
                for day in sorted(free_by_day):
                    for left, right in list(free_by_day[day]):
                        size = min(chunk, remaining, right - left)
                        if size >= min(chunk, remaining):
                            placed.append(Block(day, _time(left), _time(left + size)))
                            free_by_day[day].remove((left, right))
                            remaining -= size
                            found = True
                            break
                    if found:
                        break
                if not found:
                    break
        if not placed or sum((_minutes(b.end) - _minutes(b.start) for b in placed)) < task["duration_minutes"]:
            at_risk.add(task["id"])
        placements.extend(placed)
    scheduled = sum(_minutes(b.end) - _minutes(b.start) for b in placements)
    meeting_minutes = sum(_minutes(b.end) - _minutes(b.start) for b in meetings)
    return placements, {"total_available_minutes": available + meeting_minutes, "total_meeting_minutes": meeting_minutes, "total_scheduled_minutes": scheduled, "free_minutes": available - scheduled}, at_risk


def schedule_detailed(
    tasks: list[dict],
    windows: list[Window],
    meetings: list[Block],
    now: datetime,
) -> tuple[list[tuple[str, Block, bool]], dict[str, int], set[str]]:
    """Schedule tasks while retaining the task id for every placed block."""
    free_by_day = {w.day: subtract_busy(w, meetings) for w in windows}
    available = sum(right - left for slots in free_by_day.values() for left, right in slots)
    placements: list[tuple[str, Block, bool]] = []
    at_risk: set[str] = set()
    ordered = sorted(
        tasks,
        key=lambda task: (
            -effective_priority(task["priority"], task.get("deadline"), now),
            task.get("deadline") or datetime.max,
        ),
    )
    for task in ordered:
        task_id = str(task["id"])
        remaining = task["duration_minutes"]
        deadline = task.get("deadline")
        placed: list[tuple[Block, bool]] = []
        for day in sorted(free_by_day):
            if deadline is not None and day > deadline.date():
                continue
            for left, right in list(free_by_day[day]):
                original_right = right
                if deadline is not None and day == deadline.date():
                    right = min(right, _minutes(deadline.time()))
                if right - left >= remaining:
                    block = Block(day, _time(left), _time(left + remaining))
                    placed.append((block, False))
                    free_by_day[day].remove((left, original_right))
                    if left + remaining < original_right:
                        free_by_day[day].append((left + remaining, original_right))
                    break
            if placed:
                break
        if not placed and task.get("divisible"):
            chunk = task["min_block_minutes"]
            while remaining > 0:
                found = False
                for day in sorted(free_by_day):
                    if deadline is not None and day > deadline.date():
                        continue
                    for left, right in list(free_by_day[day]):
                        bounded_right = right
                        if deadline is not None and day == deadline.date():
                            bounded_right = min(bounded_right, _minutes(deadline.time()))
                        size = min(chunk, remaining, bounded_right - left)
                        if size >= min(chunk, remaining):
                            block = Block(day, _time(left), _time(left + size))
                            placed.append((block, True))
                            free_by_day[day].remove((left, right))
                            if left + size < right:
                                free_by_day[day].append((left + size, right))
                            remaining -= size
                            found = True
                            break
                    if found:
                        break
                if not found:
                    break
        scheduled_minutes = sum(_minutes(block.end) - _minutes(block.start) for block, _ in placed)
        if scheduled_minutes < task["duration_minutes"]:
            at_risk.add(task_id)
        placements.extend((task_id, block, is_subpart) for block, is_subpart in placed)
    scheduled = sum(_minutes(block.end) - _minutes(block.start) for _, block, _ in placements)
    meeting_minutes = sum(_minutes(b.end) - _minutes(b.start) for b in meetings)
    capacity = {
        "total_available_minutes": available + meeting_minutes,
        "total_meeting_minutes": meeting_minutes,
        "total_scheduled_minutes": scheduled,
        "free_minutes": available - scheduled,
    }
    return placements, capacity, at_risk

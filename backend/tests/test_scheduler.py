from datetime import date, datetime, time
from app.scheduler import Block, Window, schedule

def test_meeting_is_a_hard_constraint_and_capacity_is_deterministic():
    day = date(2026, 1, 5)
    windows = [Window(day, time(9), time(17))]
    meetings = [Block(day, time(10), time(12))]
    tasks = [{"id": "high", "duration_minutes": 60, "priority": "high"}, {"id": "low", "duration_minutes": 60, "priority": "low"}]
    first = schedule(tasks, windows, meetings, datetime(2026, 1, 1))
    second = schedule(tasks, windows, meetings, datetime(2026, 1, 1))
    assert first == second
    assert [(b.start, b.end) for b in first[0]] == [(time(9), time(10)), (time(12), time(13))]
    assert first[1]["free_minutes"] == 240

def test_unsplittable_task_is_at_risk():
    day = date(2026, 1, 5)
    result = schedule([{"id": "long", "duration_minutes": 500, "priority": "medium"}], [Window(day, time(9), time(17))], [], datetime(2026, 1, 1))
    assert result[2] == {"long"}

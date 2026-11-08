import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { WeekCalendar } from "./week-calendar";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseWeekStart(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function WeekPage({ searchParams }: {
  searchParams?: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const start = parseWeekStart(params?.week);
  start.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const rangeStart = dates[0].toISOString().slice(0, 10);
  const rangeEnd = dates[6].toISOString().slice(0, 10);
  const [{ data: blocks }, { data: meetings }] = await Promise.all([
    supabase.from("scheduled_blocks").select("id, date, start_time, end_time, tasks(title, duration_minutes, deadline, priority, divisible, recurrence)").gte("date", rangeStart).lte("date", rangeEnd).order("start_time"),
    supabase.from("meeting_blocks").select("id, date, start_time, end_time, meetings(title)").gte("date", rangeStart).lte("date", rangeEnd).order("start_time"),
  ]);
  const minutes = (items: Array<{ start_time: string; end_time: string }>) => items.reduce((sum, item) => sum + (new Date(`1970-01-01T${item.end_time}`).getTime() - new Date(`1970-01-01T${item.start_time}`).getTime()) / 60000, 0);
  const meetingMinutes = minutes(meetings ?? []);
  const taskMinutes = minutes(blocks ?? []);
  const planned = taskMinutes + meetingMinutes;
  const label = `${dates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${dates[6].toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  const previousWeek = new Date(start);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return <AppShell active="Week"><div className="mx-auto max-w-none">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</p>
        <h1 className="app-heading mt-3 text-4xl sm:text-5xl">Your week, balanced.</h1>
      </div>
      <nav aria-label="Week navigation" className="flex items-center gap-2">
        <a href={`/app/week?week=${dateKey(previousWeek)}`} className="app-card rounded-lg px-3 py-2 text-xs font-medium hover:border-[rgb(var(--app-lime-dark))]" aria-label="Go to previous week">← Previous</a>
        <a href="/app/week" className="app-card rounded-lg px-3 py-2 text-xs font-medium hover:border-[rgb(var(--app-lime-dark))]" aria-label="Go to current week">Today</a>
        <a href={`/app/week?week=${dateKey(nextWeek)}`} className="app-card rounded-lg px-3 py-2 text-xs font-medium hover:border-[rgb(var(--app-lime-dark))]" aria-label="Go to next week">Next →</a>
      </nav>
    </div>
    <p className="app-muted mt-2 text-sm">{planned ? `${blocks?.length ?? 0} scheduled work blocks and ${meetings?.length ?? 0} meetings are on your calendar.` : "Your calendar is clear. Add a task or meeting to start planning."}</p>
    <div className="app-card mt-8 grid grid-cols-2 divide-x divide-[rgb(var(--app-border))] rounded-xl"><div className="p-4"><p className="app-subtle text-[10px] uppercase">Planned</p><p className="mt-1 text-xl font-semibold">{Math.floor(planned / 60)}h {planned % 60}m</p></div><div className="p-4"><p className="app-subtle text-[10px] uppercase">Meetings</p><p className="mt-1 text-xl font-semibold">{Math.floor(meetingMinutes / 60)}h {meetingMinutes % 60}m</p></div></div>
    <div className="mt-4"><WeekCalendar dates={dates.map(dateKey)} blocks={blocks ?? []} meetings={meetings ?? []} dayNames={dayNames} /></div>
  </div></AppShell>;
}

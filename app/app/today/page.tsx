import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { TodayPlan } from "./today-plan";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [{ data: blocks }, { data: meetings }, { data: availability }] = await Promise.all([
    supabase.from("scheduled_blocks").select("id, date, start_time, end_time, status, task_id, tasks(title, duration_minutes)").eq("date", today).neq("status", "skipped").order("start_time"),
    supabase.from("meeting_blocks").select("id, date, start_time, end_time, status, meetings(title)").eq("date", today).eq("status", "active").order("start_time"),
    supabase.from("user_availability").select("day_of_week, start_time, end_time"),
  ]);
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const availableMinutes = (availability ?? [])
    .filter((row) => row.day_of_week === weekday)
    .reduce((sum, row) => sum + (new Date(`1970-01-01T${row.end_time}`).getTime() - new Date(`1970-01-01T${row.start_time}`).getTime()) / 60000, 0);
  const capacityMinutes = availableMinutes || (weekday >= 1 && weekday <= 5 ? 480 : 0);
  return <AppShell active="Today"><TodayPlan blocks={blocks ?? []} meetings={meetings ?? []} date={today} email={user?.email ?? ""} capacityMinutes={capacityMinutes} /></AppShell>;
}

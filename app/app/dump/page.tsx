import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { DumpCapture } from "./dump-capture";
import { DumpList } from "./dump-list";

export default async function DumpPage() {
  const supabase = await createClient();
  const { data: tasks, error } = await supabase.from("tasks").select("id, title, created_at, duration_minutes, deadline, priority, divisible, recurrence, recurrence_days, recurrence_end_date").eq("status", "pending").order("created_at", { ascending: false });
  return <AppShell active="Task inbox"><div className="mx-auto max-w-5xl"><p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">Task inbox</p><h1 className="app-heading mt-3 text-4xl sm:text-5xl">Get it out of your head.</h1><p className="app-muted mt-2 max-w-2xl text-sm">Give each task a deadline and rough duration. Slotted handles the rest.</p><DumpCapture />{error ? <section className="mt-6 rounded-xl border border-red-300 bg-red-50 p-6 text-red-700">Task inbox is temporarily unavailable. Please refresh and try again.</section> : <DumpList initialTasks={tasks ?? []} />}</div></AppShell>;
}

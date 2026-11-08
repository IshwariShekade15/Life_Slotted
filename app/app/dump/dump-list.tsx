"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DumpTask = {
  id: string;
  title: string;
  created_at: string;
  duration_minutes: number;
  deadline: string | null;
  priority: "high" | "medium" | "low";
  divisible: boolean;
  recurrence: "none" | "daily" | "weekdays" | "custom_days" | "n_times_per_week";
  recurrence_days: number[] | null;
  recurrence_end_date: string | null;
};

export function DumpList({ initialTasks }: { initialTasks: DumpTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState("30");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<DumpTask["priority"]>("medium");
  const [divisible, setDivisible] = useState(false);
  const [recurrence, setRecurrence] = useState<DumpTask["recurrence"]>("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  async function saveDetails(task: DumpTask) {
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 5) {
      setMessage("Enter at least 5 minutes.");
      return;
    }
    if (deadline && new Date(deadline) <= new Date()) {
      setMessage("Deadline must be in the future.");
      return;
    }
    if (recurrence !== "none" && !recurrenceEnd) {
      setMessage("Choose the date when repetition should end.");
      return;
    }
    if (recurrence === "custom_days" && !recurrenceDays.length) {
      setMessage("Choose at least one repeating day.");
      return;
    }
    setBusyTaskId(task.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in again before saving.");
      setBusyTaskId(null);
      return;
    }
    const { error } = await supabase.from("tasks").update({
      duration_minutes: duration,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
      divisible,
      min_block_minutes: divisible ? 15 : duration,
      recurrence,
      recurrence_days: recurrenceDays.length ? recurrenceDays : null,
      recurrence_end_date: recurrenceEnd || null,
    }).eq("id", task.id).eq("user_id", user.id);
    setMessage(error ? `Could not save task details: ${error.message}` : "Task details saved. Click Find time when ready.");
    setBusyTaskId(null);
  }

  async function scheduleTask(task: DumpTask) {
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 5) {
      setMessage("Enter at least 5 minutes.");
      return;
    }
    setBusyTaskId(task.id);
    setMessage("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("Sign in again before scheduling.");
      setBusyTaskId(null);
      return;
    }
    if (deadline && new Date(deadline) <= new Date()) {
      setMessage("Deadline must be in the future.");
      return;
    }
    if (recurrence !== "none" && !recurrenceEnd) {
      setMessage("Choose the date when repetition should end.");
      return;
    }
    if (recurrence === "custom_days" && !recurrenceDays.length) {
      setMessage("Choose at least one repeating day.");
      return;
    }
    const { error: updateError } = await supabase.from("tasks").update({
      duration_minutes: duration,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
      divisible,
      min_block_minutes: divisible ? 15 : duration,
      recurrence,
      recurrence_days: recurrenceDays.length ? recurrenceDays : null,
      recurrence_end_date: recurrenceEnd || null,
    }).eq("id", task.id).eq("user_id", user.id);
    if (updateError) {
      setMessage(`Could not schedule this task: ${updateError.message}`);
      setBusyTaskId(null);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setMessage("Your login session expired. Please sign in again.");
      setBusyTaskId(null);
      return;
    }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/schedule/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ tasks: [{ id: task.id, duration_minutes: duration, priority, deadline: deadline ? new Date(deadline).toISOString() : null, divisible, min_block_minutes: divisible ? 15 : duration, recurrence, recurrence_days: recurrenceDays.length ? recurrenceDays : null, recurrence_end_date: recurrenceEnd || null }] }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { detail?: string } | null;
      setMessage(errorBody?.detail ? `Scheduling could not run: ${errorBody.detail}` : "Scheduling could not be completed. Check that the backend is running.");
      setBusyTaskId(null);
      return;
    }
    const schedule = await response.json() as { blocks?: Array<{ date: string; start_time: string; end_time: string; is_subpart: boolean }>; at_risk?: string[] };
    if (!schedule.blocks?.length) {
      setMessage("No suitable calendar slot was found. The task remains in your inbox.");
      setBusyTaskId(null);
      return;
    }
    const { error: blockError } = await supabase.from("scheduled_blocks").insert(schedule.blocks.map((block) => ({
      task_id: task.id,
      user_id: user.id,
      date: block.date,
      start_time: block.start_time,
      end_time: block.end_time,
      is_subpart: block.is_subpart,
      status: "upcoming",
    })));
    if (blockError) {
      setMessage(`Task updated, but calendar placement failed: ${blockError.message}`);
      setBusyTaskId(null);
      return;
    }
    const { error: statusError } = await supabase.from("tasks").update({ status: "scheduled", is_dump: false }).eq("id", task.id).eq("user_id", user.id);
    if (statusError) {
      setMessage(`Calendar placement succeeded, but task status could not be updated: ${statusError.message}`);
      setBusyTaskId(null);
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setOpenId(null);
    setMessage("Task scheduled and removed from the inbox.");
    setBusyTaskId(null);
  }

  if (!tasks.length) return <section className="app-card mt-8 rounded-xl p-8"><p className="app-muted">Your task inbox is clear.</p>{message && <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-[rgb(var(--app-sidebar))]">{message}</p>}<a href="/app/week" className="app-lime mt-4 inline-block text-xs font-semibold">View it on your week calendar →</a></section>;
  return <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><section className="app-card overflow-hidden rounded-xl"><div className="flex items-center justify-between border-b border-[rgb(var(--app-border))] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#e4edd7] px-1 text-xs font-semibold text-[#46623d]">{tasks.length}</span><h2 className="text-sm font-semibold">Needs scheduling</h2></div></div>{tasks.map((task, index) => <article key={task.id} className={`mx-5 flex items-start gap-3 border-b border-[rgb(var(--app-border))] py-6 last:border-b-0 ${index % 2 ? "border-l-2 border-l-[#6d9ec4] pl-3" : "border-l-2 border-l-[#9b72d1] pl-3"}`}><span className="mt-1 h-5 w-5 rounded-md border border-[rgb(var(--app-border))]" /><div className="min-w-0 flex-1"><h3 className="font-semibold">{task.title}</h3><p className="mt-2 text-xs app-subtle">Added {new Date(task.created_at).toLocaleDateString()}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] app-muted"><span className="rounded-md bg-[rgb(var(--app-bg))] px-2 py-1">◷ {task.duration_minutes || minutes}m</span><span className="rounded-md bg-[rgb(var(--app-bg))] px-2 py-1">▣ {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span><span className="rounded-md bg-[rgb(var(--app-bg))] px-2 py-1">{task.priority}</span></div>{openId === task.id && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold app-muted">Duration<input type="number" min="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-sm" /></label><label className="text-xs font-semibold app-muted">Deadline<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-sm" /></label><label className="text-xs font-semibold app-muted">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as DumpTask["priority"])} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-sm"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="flex items-center gap-2 text-xs font-semibold app-muted"><input type="checkbox" checked={divisible} onChange={(event) => setDivisible(event.target.checked)} />Can be divided into slots</label><label className="text-xs font-semibold app-muted sm:col-span-2">Repeating task<select value={recurrence} onChange={(event) => setRecurrence(event.target.value as DumpTask["recurrence"])} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-sm"><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekdays">Every weekday</option><option value="custom_days">Selected days</option><option value="n_times_per_week">N days per week</option></select></label>{recurrence !== "none" && <label className="text-xs font-semibold app-muted">Repeat until<input type="date" value={recurrenceEnd} onChange={(event) => setRecurrenceEnd(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-sm" /></label>}{recurrence === "custom_days" && <div className="sm:col-span-2"><p className="text-xs font-semibold app-muted">Repeat on</p><div className="mt-2 flex gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button type="button" key={day} onClick={() => setRecurrenceDays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} className={`rounded-md px-2 py-1 text-xs ${recurrenceDays.includes(index) ? "bg-[rgb(var(--app-sidebar))] text-white" : "border border-[rgb(var(--app-border))] app-muted"}`}>{day}</button>)}</div></div>}  <div className="flex gap-2 sm:col-span-2">  <button disabled={busyTaskId !== null} onClick={() => void saveDetails(task)} className="h-9 rounded-lg border border-[rgb(var(--app-border))] px-3 text-xs font-semibold app-muted disabled:opacity-60">{busyTaskId === task.id ? "Saving..." : "Save details"}</button>    <button disabled={busyTaskId !== null} onClick={() => void scheduleTask(task)} className="h-9 flex-1 rounded-lg bg-white px-3 text-xs font-semibold text-[#173c2f] shadow-sm disabled:opacity-60">{busyTaskId === task.id ? "Finding time..." : "Find time"}</button></div></div>}</div><button onClick={() => { const opening = openId !== task.id; setOpenId(opening ? task.id : null); setMessage(""); if (opening) { setMinutes(String(task.duration_minutes || 30)); setDeadline(task.deadline ? task.deadline.slice(0, 16) : ""); setPriority(task.priority); setDivisible(task.divisible); setRecurrence(task.recurrence); setRecurrenceEnd(task.recurrence_end_date || ""); setRecurrenceDays(task.recurrence_days || []); } }} className="shrink-0 rounded-lg border border-[#d4dfc6] bg-[#f3f7ed] px-3 py-2 text-xs font-semibold text-[#48643e]">{openId === task.id ? "Cancel" : "Add details"}</button></article>)}{message && <p role="status" className="px-5 pb-4 text-xs app-muted">{message}</p>}</section><aside className="app-card rounded-xl p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f1d8] text-2xl text-[#597647]">✣</div><p className="app-lime mt-8 text-[10px] font-semibold uppercase tracking-[0.2em]">How it works</p><h2 className="mt-3 text-xl font-medium">You capture. We arrange.</h2><ol className="mt-7 space-y-5 text-xs"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--app-border))]">1</span><span><strong>Dump the task</strong><small className="mt-1 block app-subtle">Don&apos;t worry about where it goes yet.</small></span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--app-border))]">2</span><span><strong>Add rough edges</strong><small className="mt-1 block app-subtle">A deadline and duration are enough.</small></span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--app-border))]">3</span><span><strong>Let Slotted place it</strong><small className="mt-1 block app-subtle">We&apos;ll use your real available time.</small></span></li></ol><div className="mt-7 rounded-lg bg-[#f9edd9] p-3 text-xs text-[#8b6531]">⚠ We&apos;ll tell you if it won&apos;t fit.</div></aside></div>;
}

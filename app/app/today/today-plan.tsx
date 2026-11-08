"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Block = { id: string; start_time: string; end_time: string; status: string; task_id: string; tasks: { title?: string; duration_minutes?: number } | { title?: string; duration_minutes?: number }[] | null };
type Meeting = { id: string; start_time: string; end_time: string; meetings: { title?: string } | { title?: string }[] | null };

function relationTitle(value: Block["tasks"] | Meeting["meetings"], fallback: string) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation?.title || fallback;
}

export function TodayPlan({ blocks, meetings, date, email, capacityMinutes }: { blocks: Block[]; meetings: Meeting[]; date: string; email: string; capacityMinutes: number }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const durationMinutes = (start: string, end: string) => Math.max(0, Math.round((new Date(`1970-01-01T${end}`).getTime() - new Date(`1970-01-01T${start}`).getTime()) / 60000));
  const taskMinutes = blocks.reduce((sum, block) => sum + durationMinutes(block.start_time, block.end_time), 0);
  const meetingMinutes = meetings.reduce((sum, meeting) => sum + durationMinutes(meeting.start_time, meeting.end_time), 0);
  const totalMinutes = taskMinutes + meetingMinutes;
  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`));
  const firstName = email.split("@")[0] || "there";
  const plannedHours = Math.floor(totalMinutes / 60);
  const plannedRemainder = totalMinutes % 60;
  const remainingMinutes = Math.max(0, capacityMinutes - totalMinutes);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingRemainder = remainingMinutes % 60;
  const capacityPercent = capacityMinutes ? Math.min(100, Math.round((totalMinutes / capacityMinutes) * 100)) : 0;
  async function complete(block: Block) {
    setBusyId(block.id);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "completed" }).eq("id", block.task_id);
    if (!error) await supabase.from("scheduled_blocks").update({ status: "completed" }).eq("id", block.id);
    setMessage(error ? `Could not complete the task: ${error.message}` : "Task marked complete.");
    setBusyId("");
    if (!error) router.refresh();
  }
  return <div className="mx-auto max-w-none">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">{dateLabel}</p><h1 className="app-heading mt-3 text-4xl sm:text-5xl">Good morning, {firstName}.</h1><p className="app-muted mt-2 text-sm">Here’s the plan. You have enough time for what matters today.</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="app-subtle text-[10px] uppercase tracking-wider">Today&apos;s capacity</p><p className="mt-1 text-sm font-semibold">{plannedHours}h {plannedRemainder}m planned</p><p className="app-muted text-xs">{remainingHours}h {remainingRemainder}m left · {capacityMinutes}m available</p></div><div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#9db47d] text-xs font-semibold">{capacityPercent}%</div><button onClick={() => router.refresh()} aria-label="Refresh today" className="hidden rounded-lg border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface))] px-3 py-2 text-sm app-muted sm:block">Refresh</button></div></header>
    <div className="mt-8 rounded-xl border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface))] px-4 py-4 text-sm"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#d8eab6]">✦</span><strong>Your schedule is up to date.</strong> <span className="app-muted">Add work from Task Inbox when you are ready.</span></div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="app-card rounded-xl p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">Your day</p><h2 className="mt-2 text-lg font-medium">{dateLabel}&apos;s schedule</h2></div><a href="/app/week" className="app-lime text-xs font-semibold">See full week →</a></div>{blocks.length || meetings.length ? <div className="space-y-3">{blocks.map((block) => <article key={block.id} className="flex items-center justify-between gap-4 rounded-lg border border-[rgb(var(--app-border))] border-l-2 border-l-[#9b72d1] p-4"><div><p className="app-subtle text-[9px] uppercase tracking-[0.2em]">Focus</p><p className="mt-1 font-semibold">{relationTitle(block.tasks, "Task")}</p></div><div className="flex items-center gap-3"><span className="app-muted text-xs">◷ {Math.round((new Date(`1970-01-01T${block.end_time}`).getTime() - new Date(`1970-01-01T${block.start_time}`).getTime()) / 60000)}m</span><button disabled={busyId === block.id || block.status === "completed"} onClick={() => void complete(block)} className="h-6 w-6 rounded-md border border-[rgb(var(--app-border))] text-xs disabled:opacity-50" aria-label="Complete task">{block.status === "completed" ? "✓" : ""}</button></div></article>)}{meetings.map((meeting) => <article key={meeting.id} className="flex items-center justify-between gap-4 rounded-lg border border-[rgb(var(--app-border))] border-l-2 border-l-[#6d9ec4] p-4"><div><p className="app-subtle text-[9px] uppercase tracking-[0.2em]">Meeting</p><p className="mt-1 font-semibold">{relationTitle(meeting.meetings, "Meeting")}</p></div><span className="app-muted text-xs">◷ {meeting.start_time.slice(0, 5)} - {meeting.end_time.slice(0, 5)}</span></article>)}</div> : <><p className="app-muted text-sm">Nothing scheduled yet.</p><p className="app-subtle mt-2 text-sm">Add a task and Slotted will find the next honest opening.</p></>}{message && <p role="status" className="app-muted mt-4 text-sm">{message}</p>}</section>
      <aside><section className="app-card rounded-xl p-5"><p className="app-subtle text-[10px] uppercase tracking-[0.2em]">Waiting to be placed</p><h2 className="mt-3 font-medium">Task inbox</h2><p className="app-muted mt-2 text-xs">Tasks need a little detail before they can be placed.</p><a href="/app/dump" className="app-lime mt-5 block text-xs font-semibold">Review task inbox →</a></section></aside>
    </div>
  </div>;
}

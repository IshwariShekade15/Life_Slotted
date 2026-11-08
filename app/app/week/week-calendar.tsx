"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Relation<T> = T | T[] | null;
type TaskDetails = {
  title?: string;
  duration_minutes?: number;
  deadline?: string | null;
  priority?: string;
  divisible?: boolean;
  recurrence?: string;
};
type TaskBlock = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  tasks: Relation<TaskDetails>;
};
type MeetingBlock = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  meetings: Relation<{ title?: string }>;
};

const DAY_START = 0;
const DAY_END = 24 * 60;
const HOUR_HEIGHT = 64;

function relationValue<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function titleOf(relation: Relation<{ title?: string }>, fallback: string) {
  return relationValue(relation)?.title?.trim() || fallback;
}

function minutes(value: string) {
  const [hours, mins] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + mins;
}

function timeText(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}:00`;
}

function displayTime(value: string) {
  const [hours, mins] = value.slice(0, 5).split(":").map(Number);
  const normalizedHours = hours % 24;
  const suffix = normalizedHours >= 12 ? "PM" : "AM";
  const displayHours = normalizedHours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function blockStyle(start: string, end: string) {
  const top = Math.max(0, minutes(start) - DAY_START) * HOUR_HEIGHT / 60;
  const height = Math.max(28, (minutes(end) - minutes(start)) * HOUR_HEIGHT / 60);
  return { top, height };
}

function taskColor(id: string, atRisk: boolean) {
  if (atRisk) {
    return "calendar-task-risk";
  }
  const palette = ["calendar-task-purple", "calendar-task-blue", "calendar-task-green", "calendar-task-orange"];
  const hash = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function WeekCalendar({ dates, blocks, meetings, dayNames }: {
  dates: string[];
  blocks: TaskBlock[];
  meetings: MeetingBlock[];
  dayNames: string[];
}) {
  const [items, setItems] = useState(blocks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskBlock | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  async function moveTask(targetDate: string, event: React.DragEvent<HTMLDivElement>) {
    if (!draggedId) return;
    const block = items.find((item) => item.id === draggedId);
    setDraggedId(null);
    if (!block) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const duration = minutes(block.end_time) - minutes(block.start_time);
    const rawMinutes = DAY_START + ((event.clientY - bounds.top) / HOUR_HEIGHT) * 60;
    const latestStart = Math.max(DAY_START, DAY_END - duration);
    const targetStart = Math.max(DAY_START, Math.min(latestStart, Math.round(rawMinutes / 15) * 15));
    const targetEnd = targetStart + duration;
    const supabase = createClient();
    const { error } = await supabase.from("scheduled_blocks").update({
      date: targetDate,
      start_time: timeText(targetStart),
      end_time: timeText(targetEnd),
    }).eq("id", block.id);
    if (error) {
      setMessage(`Could not move "${titleOf(block.tasks, "Task")}": ${error.message}`);
      return;
    }
    setItems((current) => current.map((item) => item.id === block.id
      ? { ...item, date: targetDate, start_time: timeText(targetStart), end_time: timeText(targetEnd) }
      : item));
    setMessage(`Moved "${titleOf(block.tasks, "Task")}" to ${targetDate} at ${displayTime(timeText(targetStart))}.`);
  }

  return <>
    {message && <p role="status" className="app-muted mb-3 text-xs">{message}</p>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => setSelected(null)}>
      <section className="app-card w-full max-w-2xl rounded-xl p-5 text-sm shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="selected-task-title" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">Task details</p>
            <h2 id="selected-task-title" className="mt-2 text-lg font-semibold">{titleOf(selected.tasks, "Task")}</h2>
          </div>
          <button type="button" onClick={() => setSelected(null)} className="app-muted rounded-md px-2 py-1 text-xs hover:bg-[rgb(var(--app-bg))]">Close</button>
        </div>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
          <span><b>Time</b><br />{displayTime(selected.start_time)} – {displayTime(selected.end_time)}</span>
          <span><b>Duration</b><br />{relationValue(selected.tasks)?.duration_minutes ?? minutes(selected.end_time) - minutes(selected.start_time)} minutes</span>
          <span><b>Priority</b><br />{relationValue(selected.tasks)?.priority ?? "Medium"}</span>
          <span><b>Deadline</b><br />{relationValue(selected.tasks)?.deadline ? new Date(relationValue(selected.tasks)?.deadline as string).toLocaleString() : "No deadline"}</span>
        </div>
      </section>
    </div>}
    <section className="overflow-x-auto rounded-xl border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface))]">
      <div className="grid min-w-[1060px] grid-cols-[52px_repeat(7,minmax(130px,1fr))]">
        <div className="border-b border-[rgb(var(--app-border))]" />
        {dates.map((key, index) => <h2 key={key} className="border-b border-l border-[rgb(var(--app-border))] p-3 text-xs font-semibold">{dayNames[new Date(`${key}T12:00:00`).getDay()]} <span className="app-muted">{new Date(`${key}T12:00:00`).getDate()}</span></h2>)}
        <div className="relative" style={{ height: (DAY_END - DAY_START) * HOUR_HEIGHT / 60 }}>
          {Array.from({ length: 25 }, (_, index) => <span key={index} className="app-muted absolute left-1 text-[10px]" style={{ top: index * HOUR_HEIGHT - 6 }}>{displayTime(`${String(index % 24).padStart(2, "0")}:00`)}</span>)}
        </div>
        {dates.map((key) => {
          const dayBlocks = items.filter((block) => block.date === key);
          const dayMeetings = meetings.filter((meeting) => meeting.date === key);
          return <div key={key} className="relative border-l border-[rgb(var(--app-border))]" style={{ height: (DAY_END - DAY_START) * HOUR_HEIGHT / 60 }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void moveTask(key, event)}>
            {Array.from({ length: 25 }, (_, index) => <div key={index} className="pointer-events-none absolute inset-x-0 border-t border-[rgb(var(--app-border))] opacity-60" style={{ top: index * HOUR_HEIGHT }} />)}
            {dayBlocks.map((block) => {
              const details = relationValue(block.tasks);
              const atRisk = Boolean(details?.deadline && new Date(details.deadline).getTime() <= new Date(`${block.date}T${block.end_time}`).getTime());
              return <button type="button" key={block.id} draggable onDragStart={() => setDraggedId(block.id)} onDragEnd={() => setDraggedId(null)} onClick={() => setSelected(block)} title="Drag to change time, click for details" className={`absolute inset-x-1 z-10 rounded-md border border-l-2 p-2 text-left text-[11px] shadow-sm ${taskColor(block.id, atRisk)} ${draggedId === block.id ? "opacity-50" : ""}`} style={blockStyle(block.start_time, block.end_time)}>
              <span className="calendar-task-time">{displayTime(block.start_time)}</span><span className="mt-1 block font-medium">{titleOf(block.tasks, "Task")}</span>{atRisk && <span className="mt-1 block text-[9px] font-semibold uppercase">Deadline at risk</span>}
            </button>;
            })}
            {dayMeetings.map((meeting) => <div key={meeting.id} className="absolute inset-x-1 z-20 rounded-md border border-[rgb(var(--app-border))] border-l-2 border-l-[#6d9ec4] bg-[rgb(var(--app-surface))] p-2 text-[11px]" style={blockStyle(meeting.start_time, meeting.end_time)}>
              <span className="app-muted">{displayTime(meeting.start_time)}</span><span className="mt-1 block font-medium">{titleOf(meeting.meetings, "Meeting")}</span>
            </div>)}
          </div>;
        })}
      </div>
    </section>
  </>;
}

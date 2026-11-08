"use client";

import Link from "next/link";
import { CalendarDays, CheckSquare, ClipboardList, LogOut, Plus, Settings, UserCircle, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/app/today", label: "Today", icon: CalendarDays },
  { href: "/app/week", label: "Week", icon: ClipboardList },
  { href: "/app/dump", label: "Task inbox", icon: CheckSquare },
];

type EntryType = "task" | "meeting";

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("task");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [divisible, setDivisible] = useState(false);
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [rebalancing, setRebalancing] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        if (mounted) setUserEmail(sessionData.user?.email ?? "");
        const { data, error: loadError } = await supabase.from("tasks").select("title").eq("status", "pending").eq("is_dump", true).order("created_at", { ascending: false });
        if (!mounted) return;
        if (loadError) {
          setError(`Tasks could not be loaded: ${loadError.message}`);
          return;
        }
        setSaved((data ?? []).map((task) => task.title));
      } catch (loadError: unknown) {
        if (!mounted) return;
        setError(`Tasks could not be loaded: ${loadError instanceof Error ? loadError.message : "Check your connection and Supabase configuration."}`);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/auth/sign-in");
  }

  async function handleRebalance() {
    setRebalancing(true);
    setError("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Your session has expired. Sign in again before rebalancing.");
      setRebalancing(false);
      return;
    }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/schedule/rebalance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError("The schedule could not be rebalanced. Check that the backend is running.");
    } else {
      window.location.reload();
    }
    setRebalancing(false);
  }

  function resetForm() {
    setTitle("");
    setHours("0");
    setMinutes("30");
    setPriority("medium");
    setDeadline("");
    setDivisible(false);
    setRecurrence("none");
    setRecurrenceEnd("");
    setRecurrenceDays([]);
    setMeetingDate("");
    setMeetingStart("");
    setMeetingEnd("");
    setEntryType("task");
    setError("");
  }

  function closeForm() {
    setAddOpen(false);
    resetForm();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const trimmedTitle = title.trim();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Your session has expired. Sign in again before adding an item.");
        return;
      }

      if (!trimmedTitle) {
        setError("Enter a title.");
        return;
      }

      if (entryType === "task") {
        const durationMinutes = Number(hours) * 60 + Number(minutes);
        if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
          setError("Enter a duration greater than zero.");
          return;
        }
        const { error: insertError } = await supabase.from("tasks").insert({
          user_id: user.id,
          title: trimmedTitle,
          duration_minutes: durationMinutes,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          divisible,
          min_block_minutes: divisible ? 15 : durationMinutes,
          recurrence,
          recurrence_days: recurrenceDays.length ? recurrenceDays : null,
          recurrence_end_date: recurrenceEnd || null,
        });
        if (insertError) {
          setError(`Task could not be saved: ${insertError.message}`);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/schedule/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ tasks: [{ id: "new-task", duration_minutes: durationMinutes, priority, deadline: deadline ? new Date(deadline).toISOString() : null, divisible, min_block_minutes: divisible ? 15 : durationMinutes, recurrence, recurrence_days: recurrenceDays.length ? recurrenceDays : null, recurrence_end_date: recurrenceEnd || null }] }),
          });
          if (response.ok) {
            const schedule = await response.json() as { blocks: Array<{ date: string; start_time: string; end_time: string; is_subpart: boolean }> };
            if (schedule.blocks.length) {
              const { data: createdTask } = await supabase.from("tasks").select("id").eq("user_id", user.id).eq("title", trimmedTitle).order("created_at", { ascending: false }).limit(1).single();
              if (createdTask) {
                await supabase.from("scheduled_blocks").insert(schedule.blocks.map((block) => ({ task_id: createdTask.id, user_id: user.id, date: block.date, start_time: block.start_time, end_time: block.end_time, is_subpart: block.is_subpart })));
                await supabase.from("tasks").update({ status: "scheduled" }).eq("id", createdTask.id).eq("user_id", user.id);
              }
            }
          }
        }
        setSaved((current) => [...current, trimmedTitle]);
      } else {
        if (!meetingDate || !meetingStart || !meetingEnd) {
          setError("Enter the meeting date, start time, and end time.");
          return;
        }
        if (meetingStart >= meetingEnd) {
          setError("Meeting end time must be after its start time.");
          return;
        }
        const { data: meeting, error: insertError } = await supabase.from("meetings").insert({
          user_id: user.id,
          title: trimmedTitle,
          date: meetingDate,
          start_time: meetingStart,
          end_time: meetingEnd,
        }).select("id").single();
        if (insertError) {
          setError(`Meeting could not be saved: ${insertError.message}`);
          return;
        }
        if (meeting) {
          const { error: blockError } = await supabase.from("meeting_blocks").insert({
            meeting_id: meeting.id,
            user_id: user.id,
            date: meetingDate,
            start_time: meetingStart,
            end_time: meetingEnd,
          });
          if (blockError) {
            setError(`Meeting was saved but could not be added to the calendar: ${blockError.message}`);
            return;
          }
        }
      }
      closeForm();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "The request failed. Check your connection and try again.");
    }
  }

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="app-sidebar hidden w-[190px] shrink-0 flex-col px-4 py-6 md:flex">
        <Link href="/app/today" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"><span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-[rgb(var(--app-lime))] text-[10px] text-[rgb(var(--app-lime))]">•</span>slotted</Link>
        <p className="app-sidebar-muted mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.2em]">Plan</p>
        <nav className="mt-3 space-y-1" aria-label="App navigation">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-active={active === label} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium app-sidebar-muted"><Icon size={16} />{label}{label === "Task inbox" && saved.length > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--app-lime))] px-1 text-[11px] font-bold text-[rgb(var(--app-ink))]">{saved.length}</span>}</Link>)}
        </nav>
        <div className="mt-auto">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-[11px]"><span className="app-sidebar-muted">Task inbox</span><strong className="text-[rgb(var(--app-lime))]">{saved.length}</strong></div>
            <div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-3/4 rounded-full bg-[rgb(var(--app-lime))]" /></div>
            <p className="app-sidebar-muted mt-2 text-[10px]">8h 20m still open</p>
          </div>
          <Link href="/app/settings" data-active={active === "Settings"} className="app-sidebar-muted mt-5 flex items-center gap-3 rounded-lg px-2 py-2 text-sm"><Settings size={16} />Settings</Link>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2b87a] text-xs font-semibold text-[#193327]">{(userEmail[0] ?? "?").toUpperCase()}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{userEmail || "Signed out"}</p><p className="app-sidebar-muted text-[10px]">Account</p></div></div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-[rgb(var(--app-border))] bg-[rgb(var(--app-bg))]">
          <div className="relative flex min-h-16 items-center justify-end gap-2 px-5 sm:px-8 lg:px-12">
            <span className="mr-auto hidden items-center gap-2 text-xs app-muted sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#8bcf54]" />Connected to your schedule</span>
            <button onClick={() => void handleRebalance()} disabled={rebalancing} className="hidden h-8 items-center gap-2 rounded-lg border border-[rgb(var(--app-border))] bg-[rgb(var(--app-surface))] px-3 text-xs font-medium app-muted hover:border-[rgb(var(--app-lime-dark))] disabled:opacity-60 sm:flex">↻ {rebalancing ? "Rebalancing..." : "Rebalance"}</button>
            <button onClick={() => setAddOpen(true)} className="flex h-8 items-center gap-2 rounded-lg bg-[rgb(var(--app-sidebar))] px-3 text-xs font-semibold text-white hover:opacity-90"><Plus size={15} /> Add task</button>
            <ThemeToggle />
            <button onClick={() => setProfileOpen((current) => !current)} aria-label="Open profile menu" aria-expanded={profileOpen} className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-accent hover:bg-bg"><UserCircle size={22} /></button>
            {profileOpen && <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-border bg-surface p-2 shadow-xl">
              <div className="border-b border-border px-3 py-3"><p className="text-xs text-muted">Signed in as</p><p className="truncate text-sm font-medium">{userEmail || "Your account"}</p></div>
              <Link href="/app/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><UserCircle size={17} /> Account</Link>
              <Link href="/app/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-bg"><Settings size={17} /> Settings</Link>
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-high hover:bg-bg"><LogOut size={17} /> Sign out</button>
            </div>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      </div>
      {addOpen && <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4" onClick={closeForm}>
        <section role="dialog" aria-modal="true" aria-labelledby="add-entry-title" className="mx-auto mt-8 max-w-xl rounded-2xl bg-surface p-6 shadow-2xl sm:mt-16" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-accent">Quick add</p><h2 id="add-entry-title" className="text-xl font-bold">Add to your plan</h2></div><button onClick={closeForm} aria-label="Close add task"><X size={20} /></button></div>
          <div className="mt-6 grid grid-cols-2 rounded-lg bg-bg p-1">
            {(["task", "meeting"] as const).map((type) => <button key={type} type="button" onClick={() => { setEntryType(type); setError(""); }} className={`rounded-md px-3 py-2 text-sm font-medium capitalize ${entryType === type ? "bg-surface text-accent shadow-sm" : "text-muted"}`}>{type}</button>)}
          </div>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
            <label className="block text-sm font-medium">Title<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={entryType === "task" ? "e.g. Finish project outline" : "e.g. Team planning meeting"} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
            {entryType === "task" ? <>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">Hours<input type="number" min="0" step="1" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
                <label className="block text-sm font-medium">Minutes<input type="number" min="0" max="59" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
              </div>
              <label className="block text-sm font-medium">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
              <label className="block text-sm font-medium">Deadline <span className="font-normal text-muted">(optional)</span><input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
              <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={divisible} onChange={(event) => setDivisible(event.target.checked)} className="h-4 w-4 accent-accent" /> Can this task be divided into smaller slots?</label>
              <label className="block text-sm font-medium">Repeating <select value={recurrence} onChange={(event) => setRecurrence(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent"><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekdays">Every weekday</option><option value="custom_days">Choose days</option><option value="n_times_per_week">A number of times per week</option></select></label>
              {recurrence !== "none" && <label className="block text-sm font-medium">Repeat until <span className="font-normal text-muted">(optional)</span><input type="date" value={recurrenceEnd} onChange={(event) => setRecurrenceEnd(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>}
              {recurrence === "custom_days" && <div className="grid grid-cols-4 gap-2 text-sm">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <label key={day} className="flex items-center gap-1"><input type="checkbox" checked={recurrenceDays.includes(index)} onChange={() => setRecurrenceDays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} />{day}</label>)}</div>}
            </> : <>
              <label className="block text-sm font-medium">Date<input required type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">Starts<input required type="time" value={meetingStart} onChange={(event) => setMeetingStart(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
                <label className="block text-sm font-medium">Ends<input required type="time" value={meetingEnd} onChange={(event) => setMeetingEnd(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-border px-4 outline-none focus:border-accent" /></label>
              </div>
            </>}
            <button className="h-12 w-full rounded-xl bg-accent font-semibold text-white hover:bg-[#4d51da]">{entryType === "task" ? "Add task" : "Add meeting"}</button>
          </form>
        </section>
      </div>}
    </div>
  );
}

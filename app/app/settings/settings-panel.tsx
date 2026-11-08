"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SettingsPanel() {
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [protectBreaks, setProtectBreaks] = useState(true);
  const [morningPlan, setMorningPlan] = useState(true);
  const [capacityWarnings, setCapacityWarnings] = useState(true);
  const [days, setDays] = useState(["M-0", "T-1", "W-2", "T-3", "F-4"]);
  const [start, setStart] = useState("08:30");
  const [end, setEnd] = useState("17:30");
  const [breakLength, setBreakLength] = useState("15 minutes");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    if (!days.length || start >= end) {
      setMessage("Choose at least one working day and an end time after the start time.");
      setSaving(false);
      return;
    }
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Sign in again before saving settings.");
      setSaving(false);
      return;
    }
    const activeDays = days.map((value) => Number(value.split("-")[1]));
    const { error: deleteError } = await supabase.from("user_availability").delete().eq("user_id", authData.user.id);
    if (deleteError) {
      setMessage("Settings could not be saved. Please try again.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("user_availability").insert(
      activeDays.map((day_of_week) => ({
        user_id: authData.user.id,
        day_of_week,
        start_time: start,
        end_time: end,
      })),
    );
    setMessage(error ? "Settings could not be saved. Please try again." : "Settings saved.");
    setSaving(false);
  }

  return <div className="mt-8 grid gap-5 md:grid-cols-[126px_minmax(0,1fr)]">
    <nav className="app-card h-fit rounded-xl p-2 text-xs"><button type="button" className="w-full rounded-lg bg-[#e8efdf] px-3 py-3 text-left font-semibold text-[#536d49]">Schedule</button></nav>
    <div className="space-y-4">
      <section className="app-card overflow-hidden rounded-xl"><div className="flex items-center gap-3 border-b border-[rgb(var(--app-border))] px-4 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f1d8] text-[#597647]">◷</span><div><h2 className="text-sm font-medium">Your working hours</h2><p className="app-subtle text-[10px]">Slotted only schedules work inside these boundaries.</p></div></div><div className="p-4"><p className="app-subtle text-[10px] font-semibold">Working days</p><div className="mt-3 flex gap-2">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <button type="button" aria-label={`Toggle ${day} day ${index + 1}`} aria-pressed={days.includes(`${day}-${index}`)} key={`${day}-${index}`} onClick={() => toggleDay(`${day}-${index}`)} className={`h-8 w-8 rounded-md text-xs font-semibold ${days.includes(`${day}-${index}`) ? "bg-[rgb(var(--app-sidebar))] text-white" : "border border-[rgb(var(--app-border))] app-muted"}`}>{day}</button>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-semibold app-muted">Day starts<select value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-xs"><option>08:30</option><option>09:00</option><option>10:00</option></select></label><label className="text-[10px] font-semibold app-muted">Day ends<select value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-xs"><option>17:30</option><option>18:00</option><option>19:00</option></select></label><label className="text-[10px] font-semibold app-muted">Minimum break<select value={breakLength} onChange={(event) => setBreakLength(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-xs"><option>15 minutes</option><option>30 minutes</option></select></label><label className="text-[10px] font-semibold app-muted">Timezone<select className="mt-1 h-9 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-2 text-xs"><option>Asia/Kolkata (GMT+5:30)</option><option>London (GMT+0)</option></select></label></div></div></section>
      <PreferenceCard icon="✣" title="Scheduling behavior" subtitle="Choose how much Slotted should handle automatically"><SettingRow title="Auto-rebalance my schedule" description="Move unfinished work into the next best available slot." checked={autoRebalance} onChange={setAutoRebalance} /><SettingRow title="Protect breaks and personal time" description="Never place flexible tasks over blocked recovery time." checked={protectBreaks} onChange={setProtectBreaks} /></PreferenceCard>
      <PreferenceCard icon="▱" title="Helpful notifications" subtitle="Useful nudges only. No guilt, no noise"><SettingRow title="Morning plan" description="A calm summary when your workday begins." checked={morningPlan} onChange={setMorningPlan} /><SettingRow title="Capacity warnings" description="Tell me when a deadline is no longer realistic." checked={capacityWarnings} onChange={setCapacityWarnings} /></PreferenceCard>
      <section className="app-card flex items-center justify-between rounded-xl p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2b87a] text-xs font-semibold text-[#193327]">AM</span><div><p className="text-xs font-semibold">Your profile</p><p className="app-subtle text-[10px]">Your account · Free plan</p></div></div><button className="rounded-lg border border-[rgb(var(--app-border))] px-3 py-2 text-xs app-muted">Edit profile</button></section>
      <div className="flex items-center justify-end gap-3"><p role="status" className="text-xs app-muted">{message}</p><button onClick={() => void saveSettings()} disabled={saving} className="rounded-lg bg-[rgb(var(--app-sidebar))] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "✓ Save changes"}</button></div>
    </div>
  </div>;
}

function PreferenceCard({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="app-card overflow-hidden rounded-xl"><div className="flex items-center gap-3 border-b border-[rgb(var(--app-border))] px-4 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f1d8] text-[#597647]">{icon}</span><div><h2 className="text-sm font-medium">{title}</h2><p className="app-subtle text-[10px]">{subtitle}</p></div></div>{children}</section>;
}

function SettingRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--app-border))] px-4 py-4 last:border-b-0"><div><p className="text-xs font-semibold">{title}</p><p className="app-subtle mt-1 text-[10px]">{description}</p></div><button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${checked ? "bg-[#6d8c73]" : "bg-[#c5cec3]"}`}><span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} /></button></div>;
}

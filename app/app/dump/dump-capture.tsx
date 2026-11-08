"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DumpCapture() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setMessage("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setMessage("Enter a task before saving.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in again before dumping a task.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("tasks").insert({ user_id: user.id, title: trimmedTitle, duration_minutes: 15, is_dump: true });
    if (error) {
      setMessage("Could not save the task. Please try again.");
      setSaving(false);
      return;
    }
    setTitle("");
    setMessage("Added to your task dump.");
    setSaving(false);
    router.refresh();
  }

  return <form onSubmit={submit} className="app-card mt-8 flex flex-wrap items-end gap-3 rounded-xl p-4"><label className="min-w-[220px] flex-1 text-xs font-semibold app-muted">Quick capture<input required maxLength={500} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dump a thought..." className="mt-2 h-10 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-3 text-sm outline-none focus:border-[rgb(var(--app-lime-dark))]" /></label><button disabled={saving} className="h-10 rounded-lg bg-[rgb(var(--app-sidebar))] px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Dump task"}</button>{message && <p role="status" className="w-full text-xs app-muted">{message}</p>}</form>;
}

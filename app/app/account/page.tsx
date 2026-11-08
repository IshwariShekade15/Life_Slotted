"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setName(typeof data.user?.user_metadata?.name === "string" ? data.user.user_metadata.name : "");
    });
  }, [supabase]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      setError("Name must be 100 characters or fewer.");
      setBusy(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ data: { name: trimmedName } });
    setBusy(false);
    if (updateError) {
      setError("Profile could not be saved. Please try again.");
      return;
    }
    setMessage("Profile saved.");
  }

  async function deleteAccount() {
    if (deleteConfirmation !== "DELETE") {
      setError('Type "DELETE" to confirm permanent account deletion.');
      return;
    }
    setBusy(true);
    setError("");
    const { error: deleteError } = await supabase.rpc("delete_current_user");
    if (deleteError) {
      setError("Account could not be deleted. No data was removed.");
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  return <AppShell active="">
    <div className="mx-auto max-w-3xl">
      <p className="app-subtle text-sm">Your Slotted account</p>
      <h1 className="mt-1 text-3xl font-bold">Account</h1>
      <form onSubmit={saveProfile} className="app-card mt-8 space-y-5 rounded-xl p-6">
        <div><h2 className="font-semibold">Profile</h2><p className="app-muted mt-1 text-sm">Only your name and email are stored here.</p></div>
        <label className="block text-sm font-medium">Name<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-3" /></label>
        <label className="block text-sm font-medium">Email<input value={email} readOnly className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--app-border))] bg-transparent px-3 opacity-70" /></label>
        <button disabled={busy} className="rounded-lg bg-[rgb(var(--app-sidebar))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save profile"}</button>
        {message && <p role="status" className="text-sm text-success">{message}</p>}
        {error && <p role="alert" className="text-sm text-high">{error}</p>}
      </form>
      <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">Delete account</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">This permanently deletes your profile, tasks, meetings, schedules, and habit data. This cannot be undone.</p>
        <label className="mt-4 block text-sm font-medium text-red-900">Type DELETE to confirm<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-red-300 bg-white px-3 text-red-900" /></label>
        <button type="button" disabled={busy} onClick={() => void deleteAccount()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Delete my account</button>
      </section>
    </div>
  </AppShell>;
}

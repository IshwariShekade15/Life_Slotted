"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void createClient().auth.getSession().then(({ data }) => {
      if (active) {
        setReady(Boolean(data.session));
        if (!data.session) setError("This reset link is invalid or has expired. Request a new one.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("We could not update your password. Request a new reset link and try again.");
      return;
    }
    await createClient().auth.signOut();
    setMessage("Your password was updated. Sign in with your new password.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Slotted</Link>
        <h1 className="mt-8 text-3xl font-bold text-ink">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Use a unique password you do not reuse elsewhere.</p>
        {ready && !message && <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-ink">New password<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none focus:border-accent" /></label>
          <label className="block text-sm font-medium text-ink">Confirm password<input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none focus:border-accent" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-high">{error}</p>}
          <button disabled={busy} className="min-h-11 w-full rounded-xl bg-accent px-5 font-semibold text-white disabled:opacity-60">{busy ? "Updating..." : "Update password"}</button>
        </form>}
        {message && <p role="status" className="mt-6 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{message}</p>}
        {!ready && !message && error && <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-high">{error}</p>}
        <Link href="/auth/sign-in" className="mt-6 block text-center text-sm font-semibold text-accent hover:underline">Back to sign in</Link>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

type Mode = "sign-in" | "sign-up";

export default function AuthForm({ mode }: { mode: Mode }) {
  const isSignUp = mode === "sign-up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const domain = normalizedEmail.split("@")[1] ?? "";
    const commonDomainCorrections: Record<string, string> = {
      "gmai.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmal.com": "gmail.com",
      "yaho.com": "yahoo.com",
      "hotmial.com": "hotmail.com",
      "outlok.com": "outlook.com",
      "icloud.con": "icloud.com",
    };
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address, such as you@example.com.");
      setBusy(false);
      return;
    }
    if (commonDomainCorrections[domain]) {
      setError(`Did you mean ${normalizedEmail.replace(domain, commonDomainCorrections[domain])}?`);
      setBusy(false);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createClient();
      const result = isSignUp
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app/today` } })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (result.error) {
        setError(isSignUp ? "We could not create that account. Check your details and try again." : "Email or password is incorrect.");
      } else if (isSignUp && !result.data.session) {
        setMessage("Check your email to confirm your account, then come back to sign in.");
      } else {
        window.location.assign("/app/today");
      }

    } catch (caught: unknown) {
      setError("The request failed. Check your connection and try again.");
    }
    setBusy(false);
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage("If an account exists for that email, we sent a password reset link.");
    } catch {
      setMessage("If an account exists for that email, we sent a password reset link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app/today`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setBusy(false);
      }
    } catch (caught: unknown) {
      setError("Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Slotted</Link>
          <ThemeToggle />
        </div>
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-accent">{isSignUp ? "Start with less planning" : "Welcome back"}</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{isSignUp ? "Make room for the work." : "Pick up where you left off."}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{isSignUp ? "Create your free account. Slotted will help you build an honest day." : resetMode ? "Enter your email and we will send a secure reset link if an account exists." : "Sign in to see your schedule and let Slotted handle the reshuffling."}</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="mt-8 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-5 font-semibold text-ink transition hover:border-accent disabled:cursor-wait disabled:opacity-60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.34Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.51c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.39 13.89a6 6 0 0 1 0-3.78V7.52H3.05a10 10 0 0 0 0 8.96l3.34-2.59Z" />
              <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.97 14.7 2 12 2a10 10 0 0 0-8.95 5.52l3.34 2.59C7.18 7.74 9.39 5.98 12 5.98Z" />
            </svg>
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {resetMode ? <form onSubmit={handlePasswordReset} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-ink">Email<input required type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none transition focus:border-accent" /></label>
            {message && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{message}</p>}
            <button disabled={busy} className="min-h-11 w-full rounded-xl bg-accent px-5 font-semibold text-white transition hover:bg-[#4d51da] disabled:cursor-wait disabled:opacity-60">{busy ? "Sending..." : "Send reset link"}</button>
            <button type="button" onClick={() => { setResetMode(false); setMessage(""); }} className="w-full text-sm font-semibold text-accent hover:underline">Back to sign in</button>
          </form> : <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-ink">{isSignUp ? "Email" : "Email / username"}<input required type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none transition focus:border-accent" /></label>
            <label className="block text-sm font-medium text-ink">Password<input required minLength={isSignUp ? 12 : 1} type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none transition focus:border-accent" /></label>
            {isSignUp && <label className="block text-sm font-medium text-ink">Confirm password<input required minLength={12} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none transition focus:border-accent" /></label>}
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-high">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">{message}</p>}
            <button disabled={busy} className="min-h-11 w-full rounded-xl bg-accent px-5 font-semibold text-white transition hover:bg-[#4d51da] disabled:cursor-wait disabled:opacity-60">{busy ? "One moment…" : isSignUp ? "Create account" : "Sign in"}</button>
            {!isSignUp && <button type="button" onClick={() => setResetMode(true)} className="w-full text-sm font-semibold text-accent hover:underline">Forgot password?</button>}
          </form>}
          <p className="mt-6 text-center text-sm text-muted">{isSignUp ? "Already have an account? " : "New to Slotted? "}<Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"} className="font-semibold text-accent hover:underline">{isSignUp ? "Sign in" : "Create an account"}</Link></p>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-[rgb(var(--landing-ink))]">Slotted</Link>
      <nav className="flex items-center gap-2 text-sm" aria-label="Main navigation">
        <ThemeToggle />
        <Link href="/auth/sign-in" className="rounded-full px-3 py-2 font-medium text-[rgb(var(--landing-muted))] hover:text-[rgb(var(--landing-ink))]">Sign in</Link>
        <Link href="/auth/sign-up" className="rounded-full bg-[rgb(var(--landing-quick-bg))] px-4 py-2 font-semibold text-[rgb(var(--landing-quick-text))] shadow-sm hover:bg-[rgb(var(--landing-blue))]">Get started</Link>
      </nav>
    </header>
  );
}

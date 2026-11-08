import Link from "next/link";
import { ArrowUpRight, Check, CircleDashed, Clock3, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const benefits = [
  ["Capture the thought", "Get the task out of your head before deciding exactly how it fits."],
  ["Find the opening", "Slotted weighs time, energy, deadlines, and meetings together."],
  ["Keep moving", "When your day changes, your plan can change with it—without the guilt."],
];

const scheduleItems = [
  { time: "09:00", title: "Deep work", detail: "Project outline", tone: "bg-[rgb(var(--landing-blue-soft))] text-[rgb(var(--landing-ink))]" },
  { time: "11:30", title: "Open space", detail: "A little breathing room", tone: "bg-[rgb(var(--landing-mint))] text-[rgb(var(--landing-ink))]" },
  { time: "14:00", title: "Team sync", detail: "30 min meeting", tone: "bg-[rgb(var(--landing-coral))] text-[rgb(var(--landing-ink))]" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[rgb(var(--landing-bg))] text-[rgb(var(--landing-ink))]">
      <SiteHeader />

      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-[rgb(var(--landing-blue-soft))] opacity-60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full bg-[rgb(var(--landing-coral))] opacity-70 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-surface))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--landing-blue))]">
              <CircleDashed size={14} /> An honest way to plan
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              Make space for what <span className="text-[rgb(var(--landing-blue))]">matters.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[rgb(var(--landing-muted))] sm:text-xl">
              Slotted turns the things you need to do into a schedule that respects your actual day—not an imaginary perfect one.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/sign-up" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[rgb(var(--landing-ink))] px-7 font-semibold text-[rgb(var(--landing-bg))] transition hover:bg-[rgb(var(--landing-blue))]">
                Start planning <ArrowUpRight size={17} />
              </Link>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-surface))] px-7 font-semibold text-[rgb(var(--landing-ink))] hover:border-[rgb(var(--landing-blue))]">
                See how it works
              </a>
            </div>
          </div>

          <div className="relative min-h-[430px] sm:min-h-[500px]" aria-label="A preview of the Slotted schedule">
            <div className="absolute inset-x-4 top-8 rounded-[2rem] border border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-surface))] p-4 shadow-[0_24px_80px_rgba(39,49,85,0.12)] sm:inset-x-8 sm:p-6">
              <div className="flex items-center justify-between border-b border-[rgb(var(--landing-border))] pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--landing-subtle))]">Tuesday</p><p className="mt-1 text-2xl font-semibold tracking-tight">A calm day ahead</p></div>
                <div className="rounded-full bg-[rgb(var(--landing-blue-soft))] px-3 py-2 text-xs font-semibold text-[rgb(var(--landing-blue))]">68% capacity</div>
              </div>
              <div className="mt-5 space-y-3">
                {scheduleItems.map((item) => <div key={item.time} className={`flex items-center gap-3 rounded-2xl p-3 sm:gap-5 sm:p-4 ${item.tone}`}><span className="w-11 text-xs font-semibold opacity-70">{item.time}</span><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm opacity-75">{item.detail}</p></div><Check className="ml-auto opacity-60" size={17} /></div>)}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--landing-border))] px-4 py-3 text-sm text-[rgb(var(--landing-subtle))]"><Clock3 size={16} /> 2h 30m still free</div>
            </div>
            <div className="absolute -left-1 bottom-10 rounded-2xl border border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-quick-bg))] px-4 py-3 text-sm text-[rgb(var(--landing-quick-text))] shadow-xl sm:left-0"><span className="text-[rgb(var(--landing-quick-accent))]">+ quick capture</span><p className="mt-1 font-medium">Remember to call Mum</p></div>
            <div className="absolute -right-1 top-0 rounded-2xl border border-[rgb(var(--landing-coral))] bg-[rgb(var(--landing-coral))] px-4 py-3 text-sm text-[rgb(var(--landing-ink))] shadow-xl sm:right-0"><Sparkles size={16} /><p className="mt-1 font-semibold">Plan, not pressure.</p></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-surface))]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[rgb(var(--landing-blue))]">A better default</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Your schedule should have room for being human.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-[rgb(var(--landing-muted))]">No streak anxiety. Just a clear next step and enough space to take it.</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {benefits.map(([title, description], index) => <article key={title} className="rounded-[1.5rem] border border-[rgb(var(--landing-border))] bg-[rgb(var(--landing-bg))] p-6 sm:p-7"><span className="text-sm font-semibold text-[rgb(var(--landing-blue))]">0{index + 1}</span><h3 className="mt-14 text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-6 text-[rgb(var(--landing-muted))]">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="rounded-[2rem] bg-[rgb(var(--landing-blue))] px-6 py-12 text-white sm:px-12 lg:flex lg:items-end lg:justify-between lg:py-16">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[rgb(var(--landing-blue-soft))]">Start with one thing</p><h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Less arranging. More living.</h2></div>
          <Link href="/auth/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[rgb(var(--landing-blue))] hover:bg-[rgb(var(--landing-blue-soft))] lg:mt-0">Create your account <ArrowUpRight size={17} /></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl justify-between border-t border-[rgb(var(--landing-border))] px-5 py-8 text-sm text-[rgb(var(--landing-subtle))] sm:px-8"><span className="font-semibold text-[rgb(var(--landing-ink))]">Slotted</span><span>Plan less. Keep moving.</span></footer>
    </main>
  );
}

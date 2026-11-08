import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "./settings-panel";

export default function SettingsPage() {
  return <AppShell active="Settings"><div className="mx-auto max-w-4xl"><div className="flex items-end justify-between gap-4"><div><p className="app-lime text-[10px] font-semibold uppercase tracking-[0.2em]">Preferences</p><h1 className="app-heading mt-3 text-4xl sm:text-5xl">Make Slotted work your way.</h1><p className="app-muted mt-2 text-sm">Set the boundaries. Your schedule will adapt around them.</p></div><button className="hidden rounded-lg bg-[rgb(var(--app-sidebar))] px-4 py-2 text-xs font-semibold text-white sm:block">✓ Save changes</button></div><SettingsPanel /></div></AppShell>;
}

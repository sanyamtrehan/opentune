"use client";

/**
 * App header: the name, and where the other sections will live.
 *
 * Chords and My Chords are deliberately shown but dead. They are in the v2
 * design, they are the agreed next feature, and greying them out is the same
 * treatment the design uses elsewhere for things that are coming — it tells
 * you the shape of the app without pretending the pages exist.
 */

const SECTIONS = [
  { label: "Tuner", ready: true },
  { label: "Chords", ready: false },
  { label: "My Chords", ready: false },
] as const;

export function Header() {
  return (
    <header className="flex flex-none items-center justify-between gap-4 px-[clamp(1rem,4vw,1.75rem)] pt-3.5 pb-2">
      <div className="flex items-baseline gap-2.5">
        <span className="text-xl font-bold tracking-tight">OpenTune</span>
        {/* A container query, not a breakpoint: the column is a fixed width
            whatever the window is, so `sm:` would show this in a 432px column
            on a 1280px screen and wrap it onto three lines. */}
        <span className="label-caps hidden whitespace-nowrap @[34rem]:inline">
          every tuning, free
        </span>
      </div>

      <nav className="flex gap-1 rounded-full border border-edge bg-panel p-[3px]">
        {SECTIONS.map(({ label, ready }) =>
          ready ? (
            <span
              key={label}
              aria-current="page"
              className="rounded-full bg-accent-bg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-accent"
            >
              {label}
            </span>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — coming soon`}
              className="cursor-not-allowed rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-ink-ghost"
            >
              {label}
            </button>
          ),
        )}
      </nav>
    </header>
  );
}

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
    <header className="flex flex-none items-center justify-between gap-4 px-[clamp(16px,4vw,28px)] pt-[14px] pb-2">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[20px] font-bold tracking-[-0.02em]">OpenTune</span>
        <span className="label-caps">every tuning, free</span>
      </div>

      <nav className="flex gap-1 rounded-full border border-edge bg-panel p-[3px]">
        {SECTIONS.map(({ label, ready }) =>
          ready ? (
            <span
              key={label}
              aria-current="page"
              className="rounded-full bg-accent-bg px-[14px] py-1.5 text-[12px] font-medium text-accent"
            >
              {label}
            </span>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} — coming soon`}
              className="cursor-not-allowed rounded-full px-3 py-1.5 text-[12px] text-ink-ghost"
            >
              {label}
            </button>
          ),
        )}
      </nav>
    </header>
  );
}

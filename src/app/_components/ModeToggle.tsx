"use client";

/**
 * Mode switch.
 *
 * The labels are "Custom" and "Auto" because that is what guitarists using
 * other tuners expect. The code never uses those words: "custom" also reads
 * like "user-defined tuning", which is a different feature entirely.
 *
 * Both modes have the microphone and the reference tone. The only difference
 * is how the string being tuned is chosen. See AGENTS.md.
 */

export type Mode = "manual" | "follow";

const MODES: ReadonlyArray<{ mode: Mode; label: string; hint: string }> = [
  { mode: "manual", label: "Custom", hint: "You choose the string" },
  { mode: "follow", label: "Auto", hint: "It follows whatever you play" },
];

export interface ModeToggleProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Tuning mode"
      className="flex flex-none rounded-xl border border-edge bg-panel p-[3px]"
    >
      {MODES.map(({ mode, label, hint }) => {
        const selected = mode === value;
        return (
          <button
            key={mode}
            role="tab"
            type="button"
            aria-selected={selected}
            title={hint}
            onClick={() => onChange(mode)}
            className={`cursor-pointer rounded-[0.5625rem] px-[1.125rem] py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright ${
              selected ? "bg-accent-bg text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

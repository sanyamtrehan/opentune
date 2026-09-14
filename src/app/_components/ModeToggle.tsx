"use client";

/**
 * Mode switch.
 *
 * The labels are "Custom" and "Auto" because that is what guitarists using
 * other tuners expect. The code never uses those words — see AGENTS.md.
 */

export type Mode = "ear" | "mic";

const MODES: ReadonlyArray<{ mode: Mode; label: string; hint: string }> = [
  { mode: "ear", label: "Custom", hint: "Hear the pitch and tune by ear" },
  { mode: "mic", label: "Auto", hint: "Play, and the needle shows the way" },
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

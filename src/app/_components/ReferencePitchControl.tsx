"use client";

/**
 * A4 reference pitch.
 *
 * Exposed in the UI because it is a parameter everywhere in the maths, and
 * because 432 and 415 are the requests that make people give up on a tuner.
 * 415 is a semitone below 440 — baroque pitch — so it is genuinely useful
 * rather than a curiosity.
 */

import { A440 } from "@/core/music/types.ts";

const CHOICES = [415, 432, A440, 442] as const;

export interface ReferencePitchControlProps {
  value: number;
  onChange: (reference: number) => void;
}

export function ReferencePitchControl({
  value,
  onChange,
}: ReferencePitchControlProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium uppercase tracking-widest text-ink-muted">
        A4 reference
      </legend>
      <div className="flex gap-2">
        {CHOICES.map((choice) => {
          const selected = choice === value;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(choice)}
              aria-pressed={selected}
              className={[
                "flex-1 rounded-xl border px-2 py-2.5 font-mono text-sm tabular-nums transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright",
                selected
                  ? "border-accent bg-accent-bg text-accent-bright"
                  : "border-edge bg-panel text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

"use client";

/**
 * The needle.
 *
 * Cents, not Hz: the whole scale is ±50 cents regardless of which string is
 * being tuned, so the gesture of turning a peg feels the same at the top and
 * bottom of the neck. Amber means in tune and appears nowhere else on this
 * screen, so it can be read at arm's length without focusing.
 */

import { formatNote } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";
import { IN_TUNE_CENTS, verdictFor } from "@/core/tunings/target.ts";

/** Everything past this reads as "a long way off" rather than as a distance. */
const SCALE_CENTS = 50;

export interface NeedleProps {
  note: Note | null;
  cents: number | null;
  /** True while a usable signal is arriving. */
  live: boolean;
}

export function Needle({ note, cents, live }: NeedleProps) {
  const clamped =
    cents === null ? 0 : Math.max(-SCALE_CENTS, Math.min(SCALE_CENTS, cents));
  const verdict = cents === null ? null : verdictFor(cents);
  const inTune = verdict === "in-tune";

  return (
    <section
      className="flex flex-col gap-4"
      aria-live="polite"
      aria-label="Tuning meter"
    >
      <div className="flex items-baseline justify-center gap-3">
        <span
          className={`font-mono text-5xl tabular-nums transition-colors ${
            inTune ? "text-accent-bright" : live ? "text-ink" : "text-ink-faint"
          }`}
        >
          {note ? formatNote(note) : "—"}
        </span>
        <span className="font-mono text-sm tabular-nums text-ink-muted">
          {cents === null
            ? ""
            : `${cents > 0 ? "+" : ""}${cents.toFixed(1)}¢`}
        </span>
      </div>

      <div className="relative h-16">
        {/* Track, with the in-tune band drawn on it so the target has width. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge" />
        <div
          className="absolute top-1/2 h-8 -translate-y-1/2 rounded-sm border-x border-accent-dim bg-accent-dim/20"
          style={{
            left: `${50 - (IN_TUNE_CENTS / SCALE_CENTS) * 50}%`,
            width: `${(IN_TUNE_CENTS / SCALE_CENTS) * 100}%`,
          }}
        />

        {/* Ticks every 10 cents, so the scale is readable without labels. */}
        {[-40, -30, -20, -10, 10, 20, 30, 40].map((tick) => (
          <div
            key={tick}
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-edge"
            style={{ left: `${50 + (tick / SCALE_CENTS) * 50}%` }}
          />
        ))}

        {cents !== null && (
          <div
            className={`absolute top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-100 ${
              inTune ? "bg-accent-bright" : "bg-ink"
            }`}
            style={{ left: `${50 + (clamped / SCALE_CENTS) * 50}%` }}
          />
        )}
      </div>

      <p className="text-center text-sm text-ink-muted">
        {cents === null
          ? "Play a string."
          : inTune
            ? "In tune."
            : verdict === "flat"
              ? "Flat — tighten."
              : "Sharp — loosen."}
      </p>
    </section>
  );
}

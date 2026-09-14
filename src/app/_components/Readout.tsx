"use client";

/**
 * The text readout under the stage: which string, how far off, what to do.
 *
 * The dial on the headstock carries the needle now, so this is words and
 * numbers only. It is the part you read when you are not sure what the dial
 * is telling you, and the part a screen reader gets.
 */

import { formatNote } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";
import { isAmbiguous, semitonesOff, verdictFor } from "@/core/tunings/target.ts";

export interface ReadoutProps {
  note: Note | null;
  cents: number | null;
  /** 1 (high E) to 6 (low E), so the player can check it picked the right one. */
  stringNumber: number | null;
  /** Shown when nothing is being heard. */
  idleHint: string;
}

export function Readout({ note, cents, stringNumber, idleHint }: ReadoutProps) {
  const verdict = cents === null ? null : verdictFor(cents);
  const inTune = verdict === "in-tune";
  // A long way from the target means we cannot be sure this is even the right
  // string, and a bare "tighten" at that distance is how strings get broken.
  // Say what it thinks, and ask.
  const unsure = cents !== null && isAmbiguous(cents);

  const centsColour = unsure
    ? "text-warn"
    : inTune
      ? "text-tuned"
      : "text-accent";

  return (
    <section
      className="min-h-[3.25rem] flex-none px-[clamp(1rem,4vw,1.75rem)] pt-0.5 text-center"
      aria-live="polite"
      aria-label="Tuning readout"
    >
      <div className="text-2xl leading-tight font-bold tracking-tight">
        {note === null ? (
          "—"
        ) : (
          <>
            {formatNote(note)}
            {/* No reading means no number — a lone "¢" is not information. */}
            {cents !== null && (
              <>
                {" "}
                <span
                  className={`font-mono text-[1.1875rem] tabular-nums ${centsColour}`}
                >
                  {cents > 0 ? "+" : ""}
                  {cents.toFixed(1)}¢
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div
        className={`mt-px text-[13px] ${
          unsure ? "text-warn" : inTune ? "text-tuned" : "text-ink-muted"
        }`}
      >
        {cents === null
          ? idleHint
          : unsure
            ? `${Math.abs(semitonesOff(cents)).toFixed(1)} semitones ${
                verdict === "flat" ? "below" : "above"
              } — check you are on string ${stringNumber}.`
            : inTune
              ? "In tune — hold it."
              : verdict === "flat"
                ? "Flat — tighten slowly."
                : "Sharp — loosen slowly."}
      </div>
    </section>
  );
}

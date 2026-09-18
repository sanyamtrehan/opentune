"use client";

/**
 * The seven chords of the key, across the top.
 *
 * Stack a third and a fifth on each note of a scale, using only notes from
 * that scale, and you get these seven — always three major, three minor and
 * one diminished, in the same order in every key. It is the first piece of
 * theory that explains something a player has already noticed: why the
 * chords in a song tend to come from a small set.
 *
 * Deliberately not interactive. It is a reference, not a second set of
 * controls: two ways to change the same thing — the tabs above and the
 * chords here — would leave you unsure which one you had used, and what
 * tapping IV was supposed to mean.
 *
 * Nothing is highlighted either. The first chord is always the one the tabs
 * already say you are on, so marking it repeats the answer and makes the row
 * look like a control that has a selection.
 */

import { diatonicChords } from "@/core/music/scales.ts";
import { rootName } from "@/core/music/chords.ts";
import type { Note } from "@/core/music/types.ts";

export interface ScaleRowProps {
  tonic: Note;
  /** Major or minor key — the toggle's two options. */
  quality: "major" | "minor";
}

export function ScaleRow({ tonic, quality }: ScaleRowProps) {
  const chords = diatonicChords(tonic, quality);

  return (
    <section
      aria-label={`Chords in the key of ${rootName(tonic)} ${quality}`}
      className="mx-auto w-full max-w-[1240px] flex-none overflow-x-auto px-[clamp(16px,4vw,28px)] pb-3"
    >
      <div className="flex w-max min-w-full gap-1.5">
        {chords.map((entry) => (
          <div
            key={entry.degree}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-[10px] border border-edge bg-panel px-2 py-1.5 min-[900px]:gap-1 min-[900px]:px-4 min-[900px]:py-2.5"
          >
            <span className="font-mono text-[11px] text-ink-faint min-[900px]:text-[13px]">
              {entry.numeral}
            </span>
            <span className="text-[13px] font-medium text-ink min-[900px]:text-[16px]">
              {entry.chord.symbol}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

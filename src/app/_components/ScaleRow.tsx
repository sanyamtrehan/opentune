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
 * What *is* marked is which of the seven are built on notes of the chord you
 * are looking at. For C major those are I, iii and V — C, E and G — because
 * a triad is the 1st, 3rd and 5th degrees of its scale. It is the same fact
 * the note states in words, shown across the key.
 *
 * That is not a selection, and deliberately does not look like one: the
 * marked entries are brighter rather than boxed, so the row still reads as a
 * reference rather than a control with something chosen in it.
 */

import { diatonicChords } from "@/core/music/scales.ts";
import type { Chord, RootSpelling } from "@/core/music/chords.ts";
import { respell, rootName } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";

export interface ScaleRowProps {
  tonic: Note;
  /** Major or minor key — the toggle's two options. */
  quality: "major" | "minor";
  spelling: RootSpelling;
  /** The chord on screen, so its notes can be picked out of the key. */
  chord: Chord;
}

const pitchClass = (note: Note) => ((midiOf(note) % 12) + 12) % 12;

export function ScaleRow({ tonic, quality, spelling, chord }: ScaleRowProps) {
  const chords = diatonicChords(tonic, quality);
  const inChord = new Set(chord.tones.map((tone) => pitchClass(tone.note)));

  return (
    <section
      aria-label={
        `Chords in the key of ${rootName(respell(tonic, spelling))} ${quality}. ` +
        `Highlighted: built on the notes of ${chord.symbol}.`
      }
      className="mx-auto w-full max-w-[1240px] flex-none overflow-x-auto px-[clamp(16px,4vw,28px)] pb-3"
    >
      <div className="flex w-max min-w-full gap-1.5">
        {chords.map((entry) => {
          const isChordTone = inChord.has(pitchClass(entry.chord.tones[0].note));
          return (
          <div
            key={entry.degree}
            title={
              isChordTone
                ? `${entry.chord.symbol} is built on a note of ${chord.symbol}`
                : undefined
            }
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-[10px] border px-2 py-1.5 min-[900px]:gap-1 min-[900px]:px-4 min-[900px]:py-2.5 ${
              isChordTone
                ? "border-accent-edge bg-accent-bg/50"
                : "border-edge bg-panel"
            }`}
          >
            <span
              className={`font-mono text-[11px] min-[900px]:text-[13px] ${
                isChordTone ? "text-accent" : "text-ink-faint"
              }`}
            >
              {entry.numeral}
            </span>
            <span
              className={`text-[13px] font-medium min-[900px]:text-[16px] ${
                isChordTone ? "text-accent-bright" : "text-ink-muted"
              }`}
            >
              {/* The symbol follows the spelling choice too, so the row does
                  not disagree with the chord it describes. */}
              {rootName(respell(entry.chord.tones[0].note, spelling))}
              {entry.chord.quality === "minor"
                ? "m"
                : entry.chord.quality === "diminished"
                  ? "°"
                  : ""}
            </span>
          </div>
          );
        })}
      </div>
    </section>
  );
}

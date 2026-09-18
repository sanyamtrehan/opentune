/**
 * What a shape is actually doing, string by string.
 *
 * The thing chord diagrams never tell you. A C major diagram shows five dots
 * and circles; what you are holding is C E G C E — the root three... no, the
 * root twice, the third twice and the fifth once. Guitar voicings are almost
 * never a clean triad, and knowing which notes are doubled and which are
 * missing is the difference between memorising a shape and understanding it.
 *
 * Pure: a shape, a chord and a tuning in, a description out.
 */

import { toneAt } from "../music/chords.ts";
import type { Chord, ChordTone } from "../music/chords.ts";
import { midiOf } from "../music/notes.ts";
import type { Note } from "../music/types.ts";
import type { ChordShape, FretPosition } from "./shapes.ts";

export interface StringAnalysis {
  /** 6 is the low string, 1 the high one, as players count them. */
  stringNumber: number;
  fret: FretPosition;
  /** Null when the string is not played. */
  note: Note | null;
  /** "1", "3", "♭3", "5" — or null for a note outside the chord. */
  degree: string | null;
}

export interface DegreeCount {
  tone: ChordTone;
  /** How many strings sound this degree. */
  count: number;
}

export interface ShapeAnalysis {
  strings: StringAnalysis[];
  /** Every chord tone, with how often it sounds. Root first. */
  degrees: DegreeCount[];
  /** Chord tones the shape leaves out entirely. */
  missing: ChordTone[];
  /** The lowest sounding note. */
  bass: { note: Note; degree: string | null };
  /** True when the bass is not the root — a C/E rather than a C. */
  inverted: boolean;
}

/**
 * Describe a shape against a chord and a tuning.
 *
 * `strings` is the open tuning, low string first — so this works for any
 * tuning, even though the shapes it is given are currently standard only.
 */
export function analyseShape(
  shape: ChordShape,
  chord: Chord,
  strings: Note[],
): ShapeAnalysis {
  const analysed: StringAnalysis[] = shape.frets.map((fret, index) => {
    const stringNumber = strings.length - index;
    if (fret === "muted") {
      return { stringNumber, fret, note: null, degree: null };
    }
    const midi = midiOf(strings[index]) + fret;
    const tone = toneAt(chord, midi);
    return {
      stringNumber,
      fret,
      // A note outside the chord still sounds, and still has to be named —
      // fall back to the string's own spelling rather than hiding it.
      note: tone?.note ?? null,
      degree: tone?.degree ?? null,
    };
  });

  const sounding = analysed.filter((string) => string.note !== null);

  const degrees: DegreeCount[] = chord.tones.map((tone) => ({
    tone,
    count: sounding.filter((string) => string.degree === tone.degree).length,
  }));

  const lowest = sounding.reduce((deepest, string) =>
    midiOf(string.note!) < midiOf(deepest.note!) ? string : deepest,
  );

  return {
    strings: analysed,
    degrees,
    missing: degrees.filter((entry) => entry.count === 0).map((entry) => entry.tone),
    bass: { note: lowest.note!, degree: lowest.degree },
    inverted: lowest.degree !== "1",
  };
}

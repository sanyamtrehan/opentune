/**
 * Movable shapes: one pattern, every root.
 *
 * A barre chord is the same handful of fingers slid along the neck. F major
 * and G major are not two shapes to learn, they are the E shape at the 1st
 * fret and at the 3rd — which is the whole reason guitarists tolerate barre
 * chords at all.
 *
 * So the library stores four patterns and works out where each root falls,
 * rather than enumerating twenty-odd chords by hand. Same argument as the
 * tunings in `core/tunings`: hand-typed lists rot, and generated ones cannot
 * disagree with themselves.
 */

import { midiOf } from "../music/notes.ts";
import type { ChordQuality } from "../music/chords.ts";
import type { Note } from "../music/types.ts";
import type { ChordShape, Finger, FretPosition } from "./shapes.ts";

export interface MovablePattern {
  id: string;
  /** What a player calls it: "E shape", "A shape". */
  name: string;
  quality: ChordQuality;
  /** Offsets from the barre fret, low string first. */
  offsets: (number | "muted")[];
  fingers: Finger[];
  /** Which string carries the root, 0 being the low E. */
  rootString: number;
  /** Strings the first finger flattens across, inclusive. */
  barre: [number, number];
}

/**
 * The two shapes that between them cover every root.
 *
 * There are more — the C, G and D shapes of the CAGED system — but these two
 * are what people actually play, and each covers all twelve roots on its own.
 */
export const MOVABLE_PATTERNS: readonly MovablePattern[] = [
  {
    id: "e-shape-major",
    name: "E shape",
    quality: "major",
    offsets: [0, 2, 2, 1, 0, 0],
    fingers: [1, 3, 4, 2, 1, 1],
    rootString: 0,
    barre: [0, 5],
  },
  {
    id: "e-shape-minor",
    name: "E shape",
    quality: "minor",
    offsets: [0, 2, 2, 0, 0, 0],
    fingers: [1, 3, 4, 1, 1, 1],
    rootString: 0,
    barre: [0, 5],
  },
  {
    id: "a-shape-major",
    name: "A shape",
    quality: "major",
    offsets: ["muted", 0, 2, 2, 2, 0],
    fingers: [null, 1, 2, 3, 4, 1],
    rootString: 1,
    barre: [1, 5],
  },
  {
    id: "a-shape-minor",
    name: "A shape",
    quality: "minor",
    offsets: ["muted", 0, 2, 2, 1, 0],
    fingers: [null, 1, 3, 4, 2, 1],
    rootString: 1,
    barre: [1, 5],
  },
];

/** Highest barre position worth offering: past this the frets are tiny. */
const HIGHEST_BARRE = 12;

/**
 * Where a pattern has to sit for its root string to sound the given root.
 *
 * Returns 12 rather than 0 when the root is the open string, because a barre
 * at the nut is just the open chord — which the library already has, played
 * better.
 */
export function barreFretFor(
  pattern: MovablePattern,
  rootPitchClass: number,
  strings: Note[],
): number {
  const open = ((midiOf(strings[pattern.rootString]) % 12) + 12) % 12;
  const fret = (((rootPitchClass - open) % 12) + 12) % 12;
  return fret === 0 ? 12 : fret;
}

/** Realise a pattern at the fret that puts its root on the given note. */
export function shapeFromPattern(
  pattern: MovablePattern,
  rootPitchClass: number,
  strings: Note[],
): ChordShape | null {
  const barreFret = barreFretFor(pattern, rootPitchClass, strings);
  if (barreFret > HIGHEST_BARRE) return null;

  const frets: FretPosition[] = pattern.offsets.map((offset) =>
    offset === "muted" ? "muted" : barreFret + offset,
  );

  return {
    id: `${pattern.id}-${rootPitchClass}`,
    name: `${pattern.name}, ${barreFret}${ordinal(barreFret)} fret`,
    rootPitchClass: ((rootPitchClass % 12) + 12) % 12,
    quality: pattern.quality,
    frets,
    fingers: [...pattern.fingers],
    barre: { fret: barreFret, from: pattern.barre[0], to: pattern.barre[1] },
  };
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

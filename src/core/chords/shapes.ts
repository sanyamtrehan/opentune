/**
 * Open-position chord shapes for standard tuning.
 *
 * Everything else in the library is generated — a movable pattern slid to
 * wherever its root falls — and these are what a generator cannot reach. An
 * open chord uses the nut as a finger, so it has no movable form: E7 and Am7
 * and Cadd9 are shapes in their own right, and they are also the first
 * chords anyone learns. Leave them out and the library offers a barre for
 * the chord a beginner already knows.
 *
 * So the rule for what belongs here is narrow: it uses at least one open
 * string, and a player would reach for it. Everything transposable lives in
 * `movable.ts`.
 *
 * These are hand-typed, so `shapes.test.ts` derives what each one actually
 * sounds on a standard-tuned fretboard and asserts it spells the chord. A
 * typo here produces a C major with an F in it, which no amount of care
 * reliably prevents and a test catches immediately.
 */

import type { ChordQuality } from "../music/chords.ts";

/** A fret number, 0 for an open string, or a string that is not played. */
export type FretPosition = number | "muted";

/** Which finger stops a string. Null where nothing is stopping it. */
export type Finger = 1 | 2 | 3 | 4 | null;

export interface ChordShape {
  id: string;
  /** What a player calls it: "Open", "E shape, 3rd fret". */
  name: string;
  /** Semitones above C, so the root tabs can find it. */
  rootPitchClass: number;
  quality: ChordQuality;
  /** Low string first, six entries. Absolute fret numbers; 0 is open. */
  frets: FretPosition[];
  /** Low string first, six entries, aligned with `frets`. */
  fingers: Finger[];
  /** One finger flattened across a run of strings, for barre shapes. */
  barre?: { fret: number; from: number; to: number };
}

const M = "muted" as const;

/**
 * Fingerings are the common ones rather than the only ones. G in particular
 * is also played 3-2-x-x-x-4, which frees the little finger for Cadd9; the
 * 2-1-x-x-x-3 given here is what most people learn first.
 *
 * Grouped by quality, and within a quality by root up from C.
 */
export const OPEN_SHAPES: readonly ChordShape[] = [
  {
    id: "c-major",
    name: "Open",
    rootPitchClass: 0,
    quality: "major",
    frets: [M, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
  },
  {
    id: "d-major",
    name: "Open",
    rootPitchClass: 2,
    quality: "major",
    frets: [M, M, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
  },
  {
    id: "e-major",
    name: "Open",
    rootPitchClass: 4,
    quality: "major",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
  },
  {
    id: "g-major",
    name: "Open",
    rootPitchClass: 7,
    quality: "major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
  },
  {
    id: "a-major",
    name: "Open",
    rootPitchClass: 9,
    quality: "major",
    frets: [M, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: "d-minor",
    name: "Open",
    rootPitchClass: 2,
    quality: "minor",
    frets: [M, M, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
  },
  {
    id: "e-minor",
    name: "Open",
    rootPitchClass: 4,
    quality: "minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
  },
  {
    id: "a-minor",
    name: "Open",
    rootPitchClass: 9,
    quality: "minor",
    frets: [M, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
  },

  // Power chords: root and fifth, and the octave because the third finger
  // is free anyway. Nothing in them says major or minor, which is the point.
  {
    id: "e-power",
    name: "Open",
    rootPitchClass: 4,
    quality: "power",
    frets: [0, 2, 2, M, M, M],
    fingers: [null, 1, 2, null, null, null],
  },
  {
    id: "a-power",
    name: "Open",
    rootPitchClass: 9,
    quality: "power",
    frets: [M, 0, 2, 2, M, M],
    fingers: [null, null, 1, 2, null, null],
  },
  {
    id: "d-power",
    name: "Open",
    rootPitchClass: 2,
    quality: "power",
    frets: [M, M, 0, 2, 3, M],
    fingers: [null, null, null, 1, 3, null],
  },

  {
    id: "a-sus2",
    name: "Open",
    rootPitchClass: 9,
    quality: "sus2",
    frets: [M, 0, 2, 2, 0, 0],
    fingers: [null, null, 1, 2, null, null],
  },
  {
    id: "d-sus2",
    name: "Open",
    rootPitchClass: 2,
    quality: "sus2",
    frets: [M, M, 0, 2, 3, 0],
    fingers: [null, null, null, 1, 3, null],
  },

  {
    id: "e-sus4",
    name: "Open",
    rootPitchClass: 4,
    quality: "sus4",
    frets: [0, 2, 2, 2, 0, 0],
    fingers: [null, 1, 2, 3, null, null],
  },
  {
    id: "a-sus4",
    name: "Open",
    rootPitchClass: 9,
    quality: "sus4",
    frets: [M, 0, 2, 2, 3, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: "d-sus4",
    name: "Open",
    rootPitchClass: 2,
    quality: "sus4",
    frets: [M, M, 0, 2, 3, 3],
    fingers: [null, null, null, 1, 2, 3],
  },

  {
    id: "c-dominant7",
    name: "Open",
    rootPitchClass: 0,
    quality: "dominant7",
    frets: [M, 3, 2, 3, 1, 0],
    fingers: [null, 3, 2, 4, 1, null],
  },
  {
    id: "d-dominant7",
    name: "Open",
    rootPitchClass: 2,
    quality: "dominant7",
    frets: [M, M, 0, 2, 1, 2],
    fingers: [null, null, null, 2, 1, 3],
  },
  {
    id: "e-dominant7",
    name: "Open",
    rootPitchClass: 4,
    quality: "dominant7",
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [null, 2, null, 1, null, null],
  },
  {
    id: "g-dominant7",
    name: "Open",
    rootPitchClass: 7,
    quality: "dominant7",
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
  },
  {
    id: "a-dominant7",
    name: "Open",
    rootPitchClass: 9,
    quality: "dominant7",
    frets: [M, 0, 2, 0, 2, 0],
    fingers: [null, null, 2, null, 3, null],
  },
  // The one open seventh with no open root under it, and the reason every
  // beginner's first blues is in E or A: B7 is where the fingers stop being
  // obvious.
  {
    id: "b-dominant7",
    name: "Open",
    rootPitchClass: 11,
    quality: "dominant7",
    frets: [M, 2, 1, 2, 0, 2],
    fingers: [null, 2, 1, 3, null, 4],
  },

  {
    id: "c-major7",
    name: "Open",
    rootPitchClass: 0,
    quality: "major7",
    frets: [M, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
  },
  {
    id: "d-major7",
    name: "Open",
    rootPitchClass: 2,
    quality: "major7",
    frets: [M, M, 0, 2, 2, 2],
    fingers: [null, null, null, 1, 2, 3],
  },
  {
    id: "e-major7",
    name: "Open",
    rootPitchClass: 4,
    quality: "major7",
    frets: [0, 2, 1, 1, 0, 0],
    fingers: [null, 3, 1, 2, null, null],
  },
  {
    id: "f-major7",
    name: "Open",
    rootPitchClass: 5,
    quality: "major7",
    frets: [M, M, 3, 2, 1, 0],
    fingers: [null, null, 3, 2, 1, null],
  },
  {
    id: "g-major7",
    name: "Open",
    rootPitchClass: 7,
    quality: "major7",
    frets: [3, 2, 0, 0, 0, 2],
    fingers: [3, 1, null, null, null, 2],
  },
  {
    id: "a-major7",
    name: "Open",
    rootPitchClass: 9,
    quality: "major7",
    frets: [M, 0, 2, 1, 2, 0],
    fingers: [null, null, 2, 1, 3, null],
  },

  {
    id: "d-minor7",
    name: "Open",
    rootPitchClass: 2,
    quality: "minor7",
    frets: [M, M, 0, 2, 1, 1],
    fingers: [null, null, null, 3, 1, 1],
  },
  {
    id: "e-minor7",
    name: "Open",
    rootPitchClass: 4,
    quality: "minor7",
    frets: [0, 2, 0, 0, 0, 0],
    fingers: [null, 2, null, null, null, null],
  },
  {
    id: "a-minor7",
    name: "Open",
    rootPitchClass: 9,
    quality: "minor7",
    frets: [M, 0, 2, 0, 1, 0],
    fingers: [null, null, 2, null, 1, null],
  },

  {
    id: "c-add9",
    name: "Open",
    rootPitchClass: 0,
    quality: "add9",
    frets: [M, 3, 2, 0, 3, 0],
    fingers: [null, 3, 2, null, 4, null],
  },
  {
    id: "e-add9",
    name: "Open",
    rootPitchClass: 4,
    quality: "add9",
    frets: [0, 2, 2, 1, 0, 2],
    fingers: [null, 2, 3, 1, null, 4],
  },
  {
    id: "g-add9",
    name: "Open",
    rootPitchClass: 7,
    quality: "add9",
    frets: [3, 2, 0, 2, 0, 3],
    fingers: [3, 2, null, 1, null, 4],
  },
  {
    id: "a-add9",
    name: "Open",
    rootPitchClass: 9,
    quality: "add9",
    frets: [M, 0, 2, 4, 2, 0],
    fingers: [null, null, 1, 3, 2, null],
  },

  {
    id: "e-dominant9",
    name: "Open",
    rootPitchClass: 4,
    quality: "dominant9",
    frets: [0, 2, 0, 1, 0, 2],
    fingers: [null, 2, null, 1, null, 3],
  },
  {
    id: "a-dominant9",
    name: "Open",
    rootPitchClass: 9,
    quality: "dominant9",
    frets: [M, 0, 2, 4, 2, 3],
    fingers: [null, null, 1, 3, 2, 4],
  },

  // The Hendrix chord has exactly one open voicing, and it is the one he
  // played: the ♯9 on the top string, a semitone above the third below it.
  {
    id: "e-dominant7sharp9",
    name: "Open",
    rootPitchClass: 4,
    quality: "dominant7sharp9",
    frets: [0, 2, 0, 1, 0, 3],
    fingers: [null, 2, null, 1, null, 4],
  },
];

/** The shape for a root and quality, if this draft has one. */
export function findShape(
  rootPitchClass: number,
  quality: ChordQuality,
): ChordShape | undefined {
  const pitchClass = ((rootPitchClass % 12) + 12) % 12;
  return OPEN_SHAPES.find(
    (shape) => shape.rootPitchClass === pitchClass && shape.quality === quality,
  );
}

/** Whether a root has anything to show, for greying out its tab. */
export function hasShape(rootPitchClass: number, quality: ChordQuality): boolean {
  return findShape(rootPitchClass, quality) !== undefined;
}

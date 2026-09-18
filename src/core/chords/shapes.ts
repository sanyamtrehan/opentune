/**
 * Open-position chord shapes for standard tuning.
 *
 * A first draft on purpose: the eight chords that have a genuine open
 * voicing. Everything else — barres, the other roots, CAGED positions,
 * anything beyond major and minor — is deliberately absent rather than
 * approximated, and the UI shows those roots as unavailable.
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
  /** Semitones above C, so the root tabs can find it. */
  rootPitchClass: number;
  quality: ChordQuality;
  /** Low string first, six entries. */
  frets: FretPosition[];
  /** Low string first, six entries, aligned with `frets`. */
  fingers: Finger[];
}

const M = "muted" as const;

/**
 * Fingerings are the common ones rather than the only ones. G in particular
 * is also played 3-2-x-x-x-4, which frees the little finger for Cadd9; the
 * 2-1-x-x-x-3 given here is what most people learn first.
 */
export const OPEN_SHAPES: readonly ChordShape[] = [
  {
    id: "c-major",
    rootPitchClass: 0,
    quality: "major",
    frets: [M, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
  },
  {
    id: "d-major",
    rootPitchClass: 2,
    quality: "major",
    frets: [M, M, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
  },
  {
    id: "e-major",
    rootPitchClass: 4,
    quality: "major",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
  },
  {
    id: "g-major",
    rootPitchClass: 7,
    quality: "major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
  },
  {
    id: "a-major",
    rootPitchClass: 9,
    quality: "major",
    frets: [M, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
  },
  {
    id: "d-minor",
    rootPitchClass: 2,
    quality: "minor",
    frets: [M, M, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
  },
  {
    id: "e-minor",
    rootPitchClass: 4,
    quality: "minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
  },
  {
    id: "a-minor",
    rootPitchClass: 9,
    quality: "minor",
    frets: [M, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
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

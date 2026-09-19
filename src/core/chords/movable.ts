/**
 * Movable shapes: one pattern, every root.
 *
 * A barre chord is the same handful of fingers slid along the neck. F major
 * and G major are not two shapes to learn, they are the E shape at the 1st
 * fret and at the 3rd — which is the whole reason guitarists tolerate barre
 * chords at all.
 *
 * So the library stores a few patterns and works out where each root falls,
 * rather than enumerating twenty-odd chords by hand. Same argument as the
 * tunings in `core/tunings`: hand-typed lists rot, and generated ones cannot
 * disagree with themselves.
 *
 * Each pattern also yields its four-string windows — the partial voicings a
 * chord book prints beside the full barre. Those are not a separate idea to
 * type out; they are the same fingers with the outer strings left alone, so
 * they are derived here rather than stored.
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
  /** Offsets from the position fret, low string first. */
  offsets: (number | "muted")[];
  fingers: Finger[];
  /** Which string carries the root, 0 being the low E. */
  rootString: number;
}

/**
 * The shapes worth sliding.
 *
 * E and A between them cover every root with the root in the bass; D adds the
 * voicing up at the top of the neck that neither of them reaches. The two
 * remaining CAGED shapes — C and G — are left out on purpose: as full barres
 * they need the first finger at two different frets at once, and nobody plays
 * them that way.
 */
export const MOVABLE_PATTERNS: readonly MovablePattern[] = [
  {
    id: "e-shape-major",
    name: "E shape",
    quality: "major",
    offsets: [0, 2, 2, 1, 0, 0],
    fingers: [1, 3, 4, 2, 1, 1],
    rootString: 0,
  },
  {
    id: "e-shape-minor",
    name: "E shape",
    quality: "minor",
    offsets: [0, 2, 2, 0, 0, 0],
    fingers: [1, 3, 4, 1, 1, 1],
    rootString: 0,
  },
  {
    id: "a-shape-major",
    name: "A shape",
    quality: "major",
    offsets: ["muted", 0, 2, 2, 2, 0],
    fingers: [null, 1, 2, 3, 4, 1],
    rootString: 1,
  },
  {
    id: "a-shape-minor",
    name: "A shape",
    quality: "minor",
    offsets: ["muted", 0, 2, 2, 1, 0],
    fingers: [null, 1, 3, 4, 2, 1],
    rootString: 1,
  },
  {
    id: "d-shape-major",
    name: "D shape",
    quality: "major",
    offsets: ["muted", "muted", 0, 2, 3, 2],
    fingers: [null, null, 1, 3, 4, 2],
    rootString: 2,
  },
  {
    id: "d-shape-minor",
    name: "D shape",
    quality: "minor",
    offsets: ["muted", "muted", 0, 2, 3, 1],
    fingers: [null, null, 2, 3, 4, 1],
    rootString: 2,
  },
];

/**
 * The four-string slices a chord book prints.
 *
 * Four adjacent strings is where the useful partials live: three is a bare
 * triad with nothing doubled, and five is the full shape with one string
 * politely ignored.
 */
const WINDOWS: ReadonlyArray<{ id: string; name: string; from: number; to: number }> = [
  { id: "low", name: "Low four", from: 0, to: 3 },
  { id: "middle", name: "Middle four", from: 1, to: 4 },
  { id: "top", name: "Top four", from: 2, to: 5 },
];

/** Below this many sounding strings a pattern is already a partial. */
const WINDOWABLE = 5;

/** Highest position worth offering: past this the frets are tiny. */
const HIGHEST_POSITION = 12;

/**
 * Where a pattern has to sit for its root string to sound the given root.
 *
 * Returns 12 rather than 0 when that lands on the open strings, because a
 * pattern at the nut is just the open chord — which the library already has,
 * played better.
 */
export function positionFretFor(
  pattern: MovablePattern,
  rootPitchClass: number,
  strings: Note[],
): number {
  const open = pitchClassOf(midiOf(strings[pattern.rootString]));
  const rootOffset = pattern.offsets[pattern.rootString] as number;
  const fret = pitchClassOf(rootPitchClass - open - rootOffset);
  return fret === 0 ? 12 : fret;
}

/**
 * Every shape a pattern gives for one root: the full one, then its windows.
 *
 * Windows are not checked for being the whole chord here — that needs to know
 * what the chord is, which is `positionsFor`'s job. Dropping the low E from
 * an A shape, for instance, throws away the third.
 */
export function shapesFromPattern(
  pattern: MovablePattern,
  rootPitchClass: number,
  strings: Note[],
): ChordShape[] {
  const fret = positionFretFor(pattern, rootPitchClass, strings);
  if (fret > HIGHEST_POSITION) return [];

  const root = pitchClassOf(rootPitchClass);
  const full = realise(pattern, pattern.offsets, pattern.fingers, fret, root, {
    id: `${pattern.id}-${root}`,
    name: `${pattern.name}, ${fret}${ordinal(fret)} fret`,
  });

  const sounding = pattern.offsets.filter((offset) => offset !== "muted").length;
  if (sounding < WINDOWABLE) return [full];

  return [
    full,
    ...WINDOWS.map((window) => {
      const offsets = pattern.offsets.map((offset, index) =>
        index < window.from || index > window.to ? ("muted" as const) : offset,
      );
      const fingers = pattern.fingers.map((finger, index) =>
        index < window.from || index > window.to ? null : finger,
      );
      return realise(pattern, offsets, fingers, fret, root, {
        id: `${pattern.id}-${window.id}-${root}`,
        name: `${window.name}, ${fret}${ordinal(fret)} fret`,
      });
    }),
  ];
}

function realise(
  pattern: MovablePattern,
  offsets: (number | "muted")[],
  fingers: Finger[],
  fret: number,
  root: number,
  labels: { id: string; name: string },
): ChordShape {
  const frets: FretPosition[] = offsets.map((offset) =>
    offset === "muted" ? "muted" : fret + offset,
  );
  return {
    ...labels,
    rootPitchClass: root,
    quality: pattern.quality,
    frets,
    fingers: [...fingers],
    barre: barreOf(offsets, fret),
  };
}

/**
 * The first finger's barre, read off the offsets rather than declared.
 *
 * Any string sitting at the position fret is under the barre; the run from
 * the first to the last of them is what the finger covers, notes fretted on
 * top of it included. One such string is not a barre, it is a fingertip.
 */
function barreOf(
  offsets: (number | "muted")[],
  fret: number,
): { fret: number; from: number; to: number } | undefined {
  const at = offsets.flatMap((offset, index) => (offset === 0 ? [index] : []));
  if (at.length < 2) return undefined;
  return { fret, from: at[0], to: at[at.length - 1] };
}

const pitchClassOf = (value: number) => ((value % 12) + 12) % 12;

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

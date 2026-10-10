/**
 * The CAGED table, shared by the prototype's lab, wheel and note.
 *
 * Deliberately not in `core/`: it is standard-tuning-only and major-only,
 * which is exactly the kind of hand-typed list `core/` is organised to
 * avoid. If the prototype survives, the real version derives these regions
 * from the tuning's own strings and the letters become a label applied when
 * the tuning happens to be standard.
 *
 * The one fact everything else rests on: the five barre frets sit at 0, 3,
 * 5, 8 and 10 semitones from one another, in every key, without exception.
 * All that changes between keys is where the run starts.
 */

export const MUTED = -1;

/** Open-string pitch classes, standard tuning, low E first. */
export const OPEN_PC = [4, 9, 2, 7, 11, 4];

/** How a player counts strings: index 0 is the low E, which they call the 6th. */
export const STRING_LABEL = ["6th", "5th", "4th", "3rd", "2nd", "1st"];

export interface Form {
  letter: string;
  /** Wedge and band. Identity — which box — never musical role. */
  colour: string;
  /** Frets above the barre, low string first; the nut's job done by a finger. */
  offsets: number[];
  /** Barre fret = (rootPitchClass - this) mod 12. */
  anchor: number;
  /** Semitones after the C shape's barre. Fixed in every key. */
  cycle: number;
  /** Wedge width in semitones — the gap to the next shape. */
  width: number;
  /** Which string to look for the root on when placing the shape. */
  rootString: number;
  /** How far above the barre that root sits. */
  rootOffset: number;
  /** Whether it is really playable as written, said plainly. */
  playNote: string;
}

export const FORMS: readonly Form[] = [
  {
    letter: "C",
    colour: "var(--color-finger-1)",
    offsets: [MUTED, 3, 2, 0, 1, 0],
    anchor: 0,
    cycle: 0,
    width: 3,
    rootString: 1,
    rootOffset: 3,
    playNote:
      "As a full barre this one asks the first finger to be at two frets at once, so nobody plays it that way. Away from the nut, players take the top four strings and let the low root go. core/chords/movable.ts leaves it out of the generated barres on exactly those grounds.",
  },
  {
    letter: "A",
    colour: "var(--color-finger-2)",
    offsets: [MUTED, 0, 2, 2, 2, 0],
    anchor: 9,
    cycle: 3,
    width: 2,
    rootString: 1,
    rootOffset: 0,
    playNote:
      "A barre across the top five strings, root on the 5th. Comfortable, and the shape most alternatives to the E barre are built out of.",
  },
  {
    letter: "G",
    colour: "var(--color-finger-3)",
    offsets: [3, 2, 0, 0, 0, 3],
    anchor: 7,
    cycle: 5,
    width: 3,
    rootString: 0,
    rootOffset: 3,
    playNote:
      "The full barre is a stretch very few people play; in practice the top three or four strings of it are what gets used. Left out of the generated barres in core/chords/movable.ts for the same reason as the C shape.",
  },
  {
    letter: "E",
    colour: "var(--color-finger-4)",
    offsets: [0, 2, 2, 1, 0, 0],
    anchor: 4,
    cycle: 8,
    width: 2,
    rootString: 0,
    rootOffset: 0,
    playNote:
      "The barre every guitarist already owns: all six strings, root on the 6th. If the chord has to ring out, this is the one.",
  },
  {
    letter: "D",
    colour: "var(--color-tuned)",
    offsets: [MUTED, MUTED, 0, 2, 3, 2],
    anchor: 2,
    cycle: 10,
    width: 2,
    rootString: 2,
    rootOffset: 0,
    playNote:
      "Four strings only, root on the 4th. Thin standing on its own, but it reaches the top of the neck where the E and A barres have run out of room.",
  },
];

export interface Placement {
  form: Form;
  barre: number;
  /** 0 the first time up the neck, 1 for the octave repeat. */
  lap: number;
  span: number;
}

export function placementsFor(rootPitchClass: number, fretCount: number): Placement[] {
  const list: Placement[] = [];
  for (const form of FORMS) {
    const span = Math.max(...form.offsets.filter((o) => o !== MUTED));
    const base = (((rootPitchClass - form.anchor) % 12) + 12) % 12;
    for (let lap = 0; lap < 2; lap++) {
      const barre = base + 12 * lap;
      if (barre + span <= fretCount) list.push({ form, barre, lap, span });
    }
  }
  return list.sort((a, b) => a.barre - b.barre || a.form.cycle - b.form.cycle);
}

export interface SoundedNote {
  string: number;
  fret: number;
  pitchClass: number;
}

/** Every note a placement actually sounds, low string first. */
export function soundedBy(p: Placement): SoundedNote[] {
  const out: SoundedNote[] = [];
  p.form.offsets.forEach((off, string) => {
    if (off === MUTED) return;
    const fret = p.barre + off;
    out.push({ string, fret, pitchClass: (OPEN_PC[string] + fret) % 12 });
  });
  return out;
}

/** Major triad only, which is all the prototype covers. */
export function degreeOf(pitchClass: number, rootPitchClass: number): string {
  const d = ((pitchClass - rootPitchClass) % 12 + 12) % 12;
  return d === 0 ? "R" : d === 4 ? "3" : d === 7 ? "5" : "?";
}

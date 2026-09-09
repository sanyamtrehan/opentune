/**
 * How a tuning's notes get spelled.
 *
 * Spelling is not derivable from pitch alone, but it is derivable from pitch
 * plus a root: Open D contains F# rather than Gb because the tuning is a D
 * chord, and D major has an F#. So every tuning is spelled relative to its
 * lowest string, treated as a tonic.
 */

import { LETTERS, letterSemitones, noteFromMidi, spellAs } from "../music/notes.ts";
import type { SpellingPreference } from "../music/notes.ts";
import type { Letter, Note } from "../music/types.ts";

/**
 * How guitarists name each root. This is convention, not theory — Eb Standard
 * and C# Standard are both universal, and no rule derives one from the other,
 * so the naming is simply stated here.
 */
const ROOT_SPELLING: ReadonlyArray<readonly [Letter, -1 | 0 | 1]> = [
  ["C", 0], ["C", 1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
];

/** Semitones above the tonic in a major scale. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** Spell the root of a tuning the way it would be named. */
export function spellRoot(midi: number): Note {
  const [letter, accidental] = ROOT_SPELLING[pitchClass(midi)];
  const octave =
    Math.round((midi - letterSemitones(letter) - accidental) / 12) - 1;
  return { letter, accidental, octave };
}

/**
 * Spell a tuning's open strings relative to its root.
 *
 * Pitches that are diatonic to the root's major scale take their scale
 * spelling — that is what puts F# in Open D and G# in Open E. Anything
 * outside the scale follows the root's own accidental, so Eb Standard's
 * chromatic notes come out Db and Gb rather than C# and F#.
 */
export function spellFromRoot(midis: number[], rootMidi: number): Note[] {
  const root = spellRoot(rootMidi);
  const rootLetterIndex = LETTERS.indexOf(root.letter);

  const diatonic = new Map<number, Letter>();
  MAJOR_SCALE.forEach((step, degree) => {
    diatonic.set(
      pitchClass(rootMidi + step),
      LETTERS[(rootLetterIndex + degree) % LETTERS.length],
    );
  });

  // Outside the scale we have no better information than the root's own
  // direction; a natural root leans flat, matching how C Standard is written.
  const fallback: SpellingPreference = root.accidental > 0 ? "sharp" : "flat";

  return midis.map((midi) => {
    const letter = diatonic.get(pitchClass(midi));
    return letter ? spellAs(midi, letter) : noteFromMidi(midi, fallback);
  });
}

/**
 * Turning a shape plus an offset into concrete, spelled notes.
 *
 * This is the only place a tuning becomes a note list. Everything upstream
 * stays generative, which is what makes unnamed tunings free.
 */

import { noteFromMidi, midiOf, parseNote } from "../music/notes.ts";
import type { SpellingPreference } from "../music/notes.ts";
import type { Fretboard, Note, Tuning, TuningShape } from "../music/types.ts";
import { STANDARD_ROOT } from "./shapes.ts";
import { spellFromRoot } from "./spelling.ts";

const STANDARD_ROOT_MIDI = midiOf(parseNote(STANDARD_ROOT));

/** Standard guitar fret count. Enough for any chord shape we would draw. */
export const DEFAULT_FRET_COUNT = 22;

/**
 * Spell a set of MIDI numbers the way a guitarist would write them.
 *
 * Delegates to the root-relative rule in `spelling.ts`; a caller who knows
 * better can force a preference instead.
 */
export function spellPitches(
  midis: number[],
  preference?: SpellingPreference,
): Note[] {
  if (preference) return midis.map((midi) => noteFromMidi(midi, preference));
  if (midis.length === 0) return [];
  return spellFromRoot(midis, midis[0]);
}

/** MIDI numbers of a shape's open strings, low to high. */
export function shapeToMidi(shape: TuningShape): number[] {
  return shape.shape.map(
    (interval) => STANDARD_ROOT_MIDI + shape.rootOffset + interval,
  );
}

export interface ResolveOptions {
  /** Force a spelling instead of letting the heuristic choose. */
  spelling?: SpellingPreference;
  /** Override the id and name, for user-built tunings. */
  id?: string;
  name?: string;
}

/** Resolve a shape to a playable tuning with spelled notes. */
export function resolveShape(
  shape: TuningShape,
  options: ResolveOptions = {},
): Tuning {
  return {
    id: options.id ?? shape.id,
    name: options.name ?? shape.name,
    strings: spellPitches(shapeToMidi(shape), options.spelling),
    userDefined: false,
  };
}

/** A tuning's open strings as a fretboard. */
export function fretboardFor(
  tuning: Tuning,
  fretCount: number = DEFAULT_FRET_COUNT,
): Fretboard {
  return { strings: tuning.strings, fretCount };
}

/**
 * Transpose a shape without resolving it, so Drop C is expressible as Drop D
 * shifted rather than as a second entry in a list.
 */
export function transposeShape(
  shape: TuningShape,
  semitones: number,
  overrides: Partial<Pick<TuningShape, "id" | "name" | "aliases">> = {},
): TuningShape {
  return {
    ...shape,
    ...overrides,
    rootOffset: shape.rootOffset + semitones,
  };
}

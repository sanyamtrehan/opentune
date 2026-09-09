/**
 * User-built tunings.
 *
 * Called `custom` nowhere in the UI — "Custom" is the label for ear mode, and
 * reusing the word for user-defined tunings is exactly the confusion AGENTS.md
 * warns about. In code these are `userDefined`.
 *
 * A user tuning is still stored as a shape plus a root offset, so it slots
 * into the same resolution path as a preset and gains nothing special.
 */

import { midiOf } from "../music/notes.ts";
import type { Note, Tuning, TuningShape } from "../music/types.ts";
import { STANDARD_ROOT } from "./shapes.ts";
import { parseNote } from "../music/notes.ts";
import { spellFromRoot } from "./spelling.ts";

const STANDARD_ROOT_MIDI = midiOf(parseNote(STANDARD_ROOT));

/** The lowest and highest a string may be set. */
export const LOWEST_MIDI = midiOf(parseNote("C1"));
export const HIGHEST_MIDI = midiOf(parseNote("C6"));

/** Guitar strings must be six, ordered low to high, and physically playable. */
export function validateStrings(notes: Note[]): string | null {
  if (notes.length !== 6) return "A guitar tuning needs six strings.";
  for (const note of notes) {
    const midi = midiOf(note);
    if (midi < LOWEST_MIDI || midi > HIGHEST_MIDI) {
      return "That pitch is outside what a guitar string can hold.";
    }
  }
  for (let i = 1; i < notes.length; i += 1) {
    if (midiOf(notes[i]) < midiOf(notes[i - 1])) {
      return "Strings must be ordered from lowest to highest.";
    }
  }
  return null;
}

/**
 * Turn a set of chosen pitches into a shape.
 *
 * Deriving the shape rather than storing notes means a user tuning can be
 * transposed, matched against presets, and later fed to chord and scale code
 * exactly like a built-in one.
 */
export function shapeFromNotes(
  notes: Note[],
  options: { id: string; name: string },
): TuningShape {
  const problem = validateStrings(notes);
  if (problem) throw new Error(problem);

  const midis = notes.map(midiOf);
  return {
    id: options.id,
    name: options.name,
    family: "other",
    shape: midis.map((midi) => midi - midis[0]),
    rootOffset: midis[0] - STANDARD_ROOT_MIDI,
  };
}

/** Resolve a user tuning, marked as theirs rather than a preset. */
export function userTuning(notes: Note[], options: { id: string; name: string }): Tuning {
  const problem = validateStrings(notes);
  if (problem) throw new Error(problem);
  const midis = notes.map(midiOf);
  return {
    id: options.id,
    name: options.name,
    strings: spellFromRoot(midis, midis[0]),
    userDefined: true,
  };
}

let sequence = 0;

/**
 * Stable id for a newly saved tuning.
 *
 * Timestamp for ordering, plus a counter so that saving several tunings
 * inside the same millisecond cannot collide. Randomness alone is not enough
 * at this scale — a few hundred draws from a small pool collide constantly.
 */
export function newTuningId(now: number = Date.now()): string {
  sequence += 1;
  return `user-${now.toString(36)}-${sequence.toString(36)}`;
}

/**
 * Name a set of pitches if a preset already describes them.
 *
 * Worth having because the generative model makes near-misses common: nudge
 * two strings of standard and you may have landed on Drop D without meaning
 * to, and telling the user that is friendlier than saving a second copy.
 */
export function identifyTuning(
  notes: Note[],
  presets: readonly TuningShape[],
  resolve: (shape: TuningShape) => Tuning,
): TuningShape | undefined {
  const target = notes.map(midiOf).join(",");
  return presets.find(
    (preset) => resolve(preset).strings.map(midiOf).join(",") === target,
  );
}

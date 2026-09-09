/**
 * Note <-> frequency conversion.
 *
 * Every function here takes the A4 reference pitch as an explicit parameter.
 * 440 is a default argument, never a constant baked into the maths — 432, 442
 * and 415 are real requests and hardcoding 440 makes them a refactor.
 */

import { A440 } from "./types.ts";
import type { Cents, Note, ReferencePitch } from "./types.ts";
import { midiOf, noteFromMidi } from "./notes.ts";
import type { SpellingPreference } from "./notes.ts";

/** MIDI 69 is A4 — the note the reference pitch names. */
const A4_MIDI = 69;

/** Frequency of a MIDI note number. Accepts fractional MIDI. */
export function midiToFrequency(
  midi: number,
  reference: ReferencePitch = A440,
): number {
  return reference * 2 ** ((midi - A4_MIDI) / 12);
}

/** Fractional MIDI note number of a frequency. */
export function frequencyToMidi(
  hz: number,
  reference: ReferencePitch = A440,
): number {
  if (hz <= 0) throw new RangeError(`Frequency must be positive, got ${hz}`);
  return A4_MIDI + 12 * Math.log2(hz / reference);
}

/** Sounding frequency of a spelled note. */
export function noteToFrequency(
  note: Note,
  reference: ReferencePitch = A440,
): number {
  return midiToFrequency(midiOf(note), reference);
}

/** Signed cents from `target` to `hz`. Negative is flat, positive is sharp. */
export function centsBetween(
  hz: number,
  targetHz: number,
  ): Cents {
  if (hz <= 0 || targetHz <= 0) {
    throw new RangeError(`Frequencies must be positive, got ${hz} and ${targetHz}`);
  }
  return 1200 * Math.log2(hz / targetHz);
}

/** A frequency described as the nearest note plus how far off it is. */
export interface NearestNote {
  note: Note;
  /** Deviation from the note, in cents. Always within +/-50. */
  cents: Cents;
}

/**
 * Nearest spelled note to a frequency, with its deviation.
 *
 * This is what `mic` mode displays. The spelling of a black key is genuinely
 * unknowable from a frequency alone, so it follows `preference`; the tuner
 * itself never uses this path, because it always knows which string it is
 * listening for.
 */
export function frequencyToNote(
  hz: number,
  reference: ReferencePitch = A440,
  preference: SpellingPreference = "sharp",
): NearestNote {
  const midi = frequencyToMidi(hz, reference);
  const note = noteFromMidi(midi, preference);
  return { note, cents: (midi - Math.round(midi)) * 100 };
}

/** Cents from a target note to a measured frequency. */
export function centsFromNote(
  hz: number,
  target: Note,
  reference: ReferencePitch = A440,
): Cents {
  return centsBetween(hz, noteToFrequency(target, reference));
}

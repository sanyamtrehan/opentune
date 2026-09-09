/**
 * Deciding what the player is trying to tune.
 *
 * `mic` mode hears a frequency and has to answer two questions: which string
 * is that, and how far off is it? Both are pure functions of the tuning, so
 * both live here rather than in a React component.
 */

import { centsFromNote, noteToFrequency } from "../music/frequency.ts";
import { A440 } from "../music/types.ts";
import type { Cents, Note, ReferencePitch } from "../music/types.ts";

export interface StringTarget {
  /** Index into the tuning's strings, low string first. */
  index: number;
  note: Note;
  /** How far the heard pitch is from that string. Negative is flat. */
  cents: Cents;
}

/**
 * Which string a heard pitch is nearest, measured in cents rather than Hz.
 *
 * Cents, because Hz distance is meaningless across octaves: 20 Hz is a
 * semitone at the bottom of the neck and a rounding error at the top. In
 * cents every string competes on equal terms.
 */
export function nearestString(
  hz: number,
  strings: Note[],
  reference: ReferencePitch = A440,
): StringTarget | null {
  if (!(hz > 0) || strings.length === 0) return null;

  let best: StringTarget | null = null;
  strings.forEach((note, index) => {
    const cents = centsFromNote(hz, note, reference);
    if (!best || Math.abs(cents) < Math.abs(best.cents)) {
      best = { index, note, cents };
    }
  });
  return best;
}

/**
 * The same question, but for a player who has already said which string they
 * are on. Used when a peg is selected: a string tuned a long way down is
 * nearer some other string, and snapping to that one mid-turn is maddening.
 */
export function targetString(
  hz: number,
  strings: Note[],
  index: number,
  reference: ReferencePitch = A440,
): StringTarget | null {
  const note = strings[index];
  if (!note || !(hz > 0)) return null;
  return { index, note, cents: centsFromNote(hz, note, reference) };
}

/** Within this many cents, a string is in tune as far as anyone can hear. */
export const IN_TUNE_CENTS = 3;

export type TuningVerdict = "flat" | "in-tune" | "sharp";

export function verdictFor(cents: Cents, tolerance = IN_TUNE_CENTS): TuningVerdict {
  if (cents < -tolerance) return "flat";
  if (cents > tolerance) return "sharp";
  return "in-tune";
}

/**
 * Frequency bounds worth searching for a given tuning.
 *
 * Narrowing the detector's range to the strings actually present is free
 * accuracy: it removes whole octaves in which a spurious peak could be
 * chosen. The margin allows for a string wound a long way out.
 */
export function searchRange(
  strings: Note[],
  reference: ReferencePitch = A440,
  marginSemitones = 4,
): { minHz: number; maxHz: number } {
  const frequencies = strings.map((note) => noteToFrequency(note, reference));
  const margin = 2 ** (marginSemitones / 12);
  return {
    minHz: Math.min(...frequencies) / margin,
    maxHz: Math.max(...frequencies) * margin,
  };
}

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

/**
 * Past this distance, which string is being played stops being obvious, and
 * the app should say so rather than confidently pointing at one.
 */
export const AMBIGUOUS_CENTS = 150;

/**
 * How close a reading must land to another string before the tuner accepts
 * that you have moved to it.
 *
 * This exists because a tuner with no memory is dangerous. Picking the
 * nearest string afresh every frame means a D string three semitones sharp
 * (175 Hz) reads as a flat G, and the app cheerfully says "tighten" — up
 * towards 196 Hz, on a string already over pitch. That is how strings break.
 *
 * Note the test is *proximity*, not "nearer than the current string". Merely
 * nearer is not enough: halfway between two strings it flips, which is
 * exactly the failure above. Requiring the reading to arrive within a
 * quarter-tone of the new string means a string being tuned stays its own
 * string right through the useful range, and only a deliberate pluck of a
 * different string moves the target.
 */
export const SNAP_CENTS = 40;

export type TuningVerdict = "flat" | "in-tune" | "sharp";

export function verdictFor(cents: Cents, tolerance = IN_TUNE_CENTS): TuningVerdict {
  if (cents < -tolerance) return "flat";
  if (cents > tolerance) return "sharp";
  return "in-tune";
}

/**
 * Follow the string already being tuned, rather than re-deciding every frame.
 *
 * `previous` is the string the last reading was attributed to. It keeps that
 * string until a reading lands within `snap` of a different one, which is
 * what stops the needle jumping to a neighbour halfway through a turn and
 * reversing the direction it is asking for. Pass `null` to pick fresh.
 */
export function trackString(
  hz: number,
  strings: Note[],
  previous: number | null,
  reference: ReferencePitch = A440,
  snap: Cents = SNAP_CENTS,
): StringTarget | null {
  const nearest = nearestString(hz, strings, reference);
  if (!nearest || previous === null) return nearest;

  const held = targetString(hz, strings, previous, reference);
  if (!held || nearest.index === held.index) return held ?? nearest;

  // Give up the current string only for one the player has actually landed
  // on, not merely drifted towards.
  const arrived =
    Math.abs(nearest.cents) <= snap &&
    Math.abs(nearest.cents) < Math.abs(held.cents);
  return arrived ? nearest : held;
}

/**
 * Whether a reading is too far from its string to trust the attribution.
 *
 * The UI uses this to stop saying a bare "tighten": at this distance the
 * honest message is which string it thinks you are on, and a question about
 * whether that is right.
 */
export function isAmbiguous(cents: Cents, limit: Cents = AMBIGUOUS_CENTS): boolean {
  return Math.abs(cents) > limit;
}

/** Distance expressed the way a player thinks about it. */
export function semitonesOff(cents: Cents): number {
  return cents / 100;
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

/**
 * Frequency bounds for one string rather than the whole tuning.
 *
 * Narrowing the search is the single biggest win available for needle
 * latency. The frame has to be long enough to hold a few periods of the
 * *lowest* pitch in the range, so a range spanning the whole tuning forces a
 * 92ms window on every string — about 30 periods of a high E, most of it
 * decay. Ask only about the string being tuned and the high E needs 23ms.
 *
 * Only safe when the player has chosen the string. A range this tight cannot
 * see the others, so the follow path keeps the full range.
 */
export function stringRange(
  strings: Note[],
  index: number,
  reference: ReferencePitch = A440,
  marginSemitones = 4,
): { minHz: number; maxHz: number } | null {
  const note = strings[index];
  if (!note) return null;
  const hz = noteToFrequency(note, reference);
  const margin = 2 ** (marginSemitones / 12);
  return { minHz: hz / margin, maxHz: hz * margin };
}

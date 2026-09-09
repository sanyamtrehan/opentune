/**
 * Core music types.
 *
 * Framework-agnostic: no React, no browser APIs. Must run in plain Node so it
 * can be unit tested directly. See AGENTS.md for the reasoning behind these
 * shapes — particularly why notes are spelled rather than stored as semitone
 * integers.
 */

/** Natural note letters. A correct scale contains exactly one of each. */
export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** Accidental in semitones: -2 double-flat through +2 double-sharp. */
export type Accidental = -2 | -1 | 0 | 1 | 2;

/**
 * A spelled pitch.
 *
 * Deliberately NOT a 0-11 pitch class. F#4 and Gb4 sound identical but are
 * different notes, and collapsing them makes diatonic harmony impossible to
 * express later. See AGENTS.md.
 */
export interface Note {
  letter: Letter;
  accidental: Accidental;
  /** Scientific pitch notation: middle C is C4, guitar's low E is E2. */
  octave: number;
}

/**
 * Concert pitch for A4, in Hz. Threaded through every note<->frequency
 * conversion rather than hardcoded, so 432/442/415 work without a refactor.
 */
export type ReferencePitch = number;

export const A440: ReferencePitch = 440;

/**
 * An instrument's playable surface. A tuning is just this object's open
 * strings — modelling it as a fretboard means scale shapes, chord diagrams,
 * capo and transposition come for free later.
 *
 * Ordered low string (6th) to high string (1st).
 */
export interface Fretboard {
  strings: Note[];
  fretCount: number;
}

/**
 * A tuning as a transposable interval shape rather than literal notes.
 *
 * `shape` is semitone offsets from the lowest string, so Drop D and Drop C are
 * the same shape at different `rootOffset`s. ~15 shapes generate the entire
 * space of named and unnamed tunings.
 */
export type TuningFamily = "standard" | "drop" | "open" | "other";

export interface TuningShape {
  id: string;
  name: string;
  /** Grouping for presentation. Catalogue data, not a UI concern. */
  family: TuningFamily;
  /** Semitones above the lowest string, ascending. Length = string count. */
  shape: number[];
  /** Semitones to transpose the whole shape, relative to standard E. */
  rootOffset: number;
  aliases?: string[];
}

/** A tuning resolved to concrete pitches, ready to tune against. */
export interface Tuning {
  id: string;
  name: string;
  strings: Note[];
  /** True for tunings the user built themselves rather than presets. */
  userDefined: boolean;
}

/** How far off pitch a reading is. Negative is flat, positive is sharp. */
export type Cents = number;

/** Result of analysing one frame of audio. */
export interface PitchReading {
  hz: number;
  /** 0-1. Below roughly 0.9, the reading should not be displayed. */
  clarity: number;
}

/**
 * A bare interval pattern, with no root.
 *
 * `intervals` are semitones above the lowest string, ascending. This is the
 * generative unit: Open D and Open E are the same pattern at different roots,
 * so they appear here once and twice in the preset list.
 */
export interface IntervalPattern {
  id: string;
  name: string;
  intervals: number[];
}

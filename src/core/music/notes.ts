/**
 * Spelled-note arithmetic.
 *
 * Notes carry a letter and an accidental, never a bare 0-11 pitch class, so
 * F#4 and Gb4 stay distinguishable. See AGENTS.md. Pitch-class integers exist
 * here only as an intermediate for arithmetic — they are never stored.
 */

import type { Accidental, Letter, Note } from "./types.ts";

/** Semitones above C for each natural letter. */
const LETTER_SEMITONES: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Which letter each pitch class gets when spelling with sharps. */
const SHARP_SPELLING: ReadonlyArray<readonly [Letter, Accidental]> = [
  ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
  ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
];

/** Which letter each pitch class gets when spelling with flats. */
const FLAT_SPELLING: ReadonlyArray<readonly [Letter, Accidental]> = [
  ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
  ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
];

/** How an ambiguous pitch class should be spelled when we have no better idea. */
export type SpellingPreference = "sharp" | "flat";

/**
 * MIDI note number. C4 (middle C) is 60, A4 is 69.
 *
 * Accidentals may push a note past its octave boundary, and that is correct:
 * B#3 and C4 are the same key on a piano, so both return 60.
 */
export function midiOf(note: Note): number {
  return (note.octave + 1) * 12 + LETTER_SEMITONES[note.letter] + note.accidental;
}

/** Spell a MIDI note number. Ambiguous pitch classes follow `preference`. */
export function noteFromMidi(
  midi: number,
  preference: SpellingPreference = "sharp",
): Note {
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const table = preference === "flat" ? FLAT_SPELLING : SHARP_SPELLING;
  const [letter, accidental] = table[pitchClass];
  return { letter, accidental, octave };
}

/** Sounding-pitch equality. C#4 and Db4 are enharmonic but not `equals`. */
export function isEnharmonic(a: Note, b: Note): boolean {
  return midiOf(a) === midiOf(b);
}

/** Spelling equality. C#4 equals only C#4. */
export function equals(a: Note, b: Note): boolean {
  return (
    a.letter === b.letter &&
    a.accidental === b.accidental &&
    a.octave === b.octave
  );
}

/**
 * Move a note by semitones, re-spelling the result.
 *
 * Transposition by a raw semitone count is genuinely spelling-ambiguous, so
 * the result follows `preference` rather than pretending to know better. Any
 * caller that cares about correct spelling (diatonic transposition, later)
 * should work in letters and intervals instead.
 */
export function transpose(
  note: Note,
  semitones: number,
  preference: SpellingPreference = "sharp",
): Note {
  return noteFromMidi(midiOf(note) + semitones, preference);
}

const ACCIDENTAL_TEXT: Record<Accidental, string> = {
  [-2]: "bb",
  [-1]: "b",
  [0]: "",
  [1]: "#",
  [2]: "##",
};

/** `{ letter: "F", accidental: 1, octave: 2 }` -> `"F#2"`. */
export function formatNote(note: Note): string {
  return `${note.letter}${ACCIDENTAL_TEXT[note.accidental]}${note.octave}`;
}

const NOTE_PATTERN = /^([A-Ga-g])(#{1,2}|b{1,2}|x)?(-?\d+)$/;

/**
 * Parse scientific pitch notation: `"F#2"`, `"Eb4"`, `"C4"`, `"Bbb3"`.
 *
 * Exists mainly so presets and tests read as music rather than as object
 * literals. Throws on anything it cannot spell.
 */
export function parseNote(text: string): Note {
  const match = NOTE_PATTERN.exec(text.trim());
  if (!match) throw new Error(`Unparseable note: ${JSON.stringify(text)}`);
  const [, rawLetter, rawAccidental = "", rawOctave] = match;

  const accidentals: Record<string, Accidental> = {
    "": 0, "#": 1, "##": 2, x: 2, b: -1, bb: -2,
  };
  const accidental = accidentals[rawAccidental];
  if (accidental === undefined) {
    throw new Error(`Unparseable accidental in ${JSON.stringify(text)}`);
  }

  return {
    letter: rawLetter.toUpperCase() as Letter,
    accidental,
    octave: Number.parseInt(rawOctave, 10),
  };
}

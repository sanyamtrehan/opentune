/**
 * Chords, spelled correctly.
 *
 * A triad is not three semitone offsets. It is a root, a third and a fifth —
 * three *letters* two apart — and the accidentals follow from making those
 * letters land on the right pitches. Build it by transposing semitones and
 * you get C# major as C# F A#, where the F should be E#: the same sounds,
 * the wrong notes, and a chord that no longer looks like a chord.
 *
 * This is the payoff for storing notes as letter-plus-accidental rather than
 * as 0-11 pitch classes. See AGENTS.md.
 */

import { LETTERS, letterSemitones, midiOf, spellAs } from "./notes.ts";
import type { Letter, Note } from "./types.ts";

export type ChordQuality = "major" | "minor";

/**
 * Semitones above the root for each degree, and how far to step the letter.
 *
 * The letter step is what makes the spelling right: the third is always two
 * letters up whether it is major or minor, so C's third is some kind of E and
 * never any kind of D or F.
 */
const DEGREES: Record<ChordQuality, ReadonlyArray<{ semitones: number; letterStep: number; degree: string }>> = {
  major: [
    { semitones: 0, letterStep: 0, degree: "1" },
    { semitones: 4, letterStep: 2, degree: "3" },
    { semitones: 7, letterStep: 4, degree: "5" },
  ],
  minor: [
    { semitones: 0, letterStep: 0, degree: "1" },
    { semitones: 3, letterStep: 2, degree: "♭3" },
    { semitones: 7, letterStep: 4, degree: "5" },
  ],
};

export interface ChordTone {
  note: Note;
  /** "1", "3", "♭3", "5" — what this note is doing in the chord. */
  degree: string;
}

export interface Chord {
  root: Note;
  quality: ChordQuality;
  /** Root, third, fifth — in that order, spelled. */
  tones: ChordTone[];
  /** "C", "Cm", "F#m". */
  symbol: string;
}

/** How the quality is written after the root. */
const SUFFIX: Record<ChordQuality, string> = { major: "", minor: "m" };

function accidentalText(note: Note): string {
  return note.accidental === 1
    ? "♯"
    : note.accidental === -1
      ? "♭"
      : note.accidental === 2
        ? "×"
        : note.accidental === -2
          ? "♭♭"
          : "";
}

/** The root's name without an octave: "C", "F♯", "E♭". */
export function rootName(note: Note): string {
  return `${note.letter}${accidentalText(note)}`;
}

/** Build a triad on a spelled root. */
export function buildChord(root: Note, quality: ChordQuality): Chord {
  const rootMidi = midiOf(root);
  const rootLetterIndex = LETTERS.indexOf(root.letter);

  const tones = DEGREES[quality].map(({ semitones, letterStep, degree }) => {
    const letter = LETTERS[(rootLetterIndex + letterStep) % LETTERS.length] as Letter;
    return { note: spellAs(rootMidi + semitones, letter), degree };
  });

  return { root, quality, tones, symbol: `${rootName(root)}${SUFFIX[quality]}` };
}

/**
 * Which degree a sounding pitch plays in a chord, and how it should be
 * spelled there.
 *
 * Matching is by pitch rather than by spelling, because the caller has a fret
 * position, not a note name — the whole point is to discover what the note is
 * called *in this chord*. A pitch that is not a chord tone returns null; the
 * caller decides what to do with it.
 */
export function toneAt(chord: Chord, midi: number): ChordTone | null {
  const pitchClass = ((midi % 12) + 12) % 12;
  const match = chord.tones.find(
    (tone) => ((midiOf(tone.note) % 12) + 12) % 12 === pitchClass,
  );
  if (!match) return null;
  // Same letter and accidental as the chord tone, moved to the right octave.
  return { note: spellAs(midi, match.note.letter), degree: match.degree };
}

/** Semitones above C, for building a root from a tab selection. */
export function rootFromPitchClass(pitchClass: number, octave = 4): Note {
  // Conventional guitar naming, the same table the tuner uses for roots.
  const spelling: ReadonlyArray<readonly [Letter, -1 | 0 | 1]> = [
    ["C", 0], ["C", 1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
  ];
  const [letter, accidental] = spelling[((pitchClass % 12) + 12) % 12];
  const midi = (octave + 1) * 12 + letterSemitones(letter) + accidental;
  return spellAs(midi, letter);
}

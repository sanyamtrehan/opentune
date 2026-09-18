/**
 * Diatonic harmony: the chords that belong to a key.
 *
 * Play the scale, stack a third and a fifth on each note using only notes
 * from that scale, and seven chords fall out — three major, three minor and
 * one diminished, always in the same order. That pattern is why chord
 * progressions in a key sound like they belong together, and it is the first
 * piece of theory that explains something a player has already noticed.
 *
 * The Roman numerals carry the qualities: uppercase is major, lowercase is
 * minor, and a lowercase numeral with a ring is diminished. So a major key is
 * always I ii iii IV V vi vii°, whatever key it is.
 */

import { buildChord } from "./chords.ts";
import type { Chord, ChordQuality } from "./chords.ts";
import { LETTERS, midiOf, spellAs } from "./notes.ts";
import type { Letter, Note } from "./types.ts";

/** Semitones above the tonic, for the two scales a key can be built on. */
const SCALE_STEPS: Record<"major" | "minor", readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  // Natural minor. The harmonic and melodic forms change the chords, and are
  // a lesson for another day.
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

export interface DiatonicChord {
  /** "I", "ii", "vii°" — cased and marked for the chord's quality. */
  numeral: string;
  /** 1-7. */
  degree: number;
  chord: Chord;
}

/**
 * The notes of a scale, spelled one per letter.
 *
 * Stepping letters rather than semitones is what keeps a scale readable: G
 * major is G A B C D E F♯, with every letter used once. Spell it by pitch
 * and the seventh becomes G♭, which puts two Gs in the scale and none of
 * the sharps a key signature is made of.
 */
export function scaleNotes(tonic: Note, quality: "major" | "minor"): Note[] {
  const tonicMidi = midiOf(tonic);
  const tonicLetter = LETTERS.indexOf(tonic.letter);
  return SCALE_STEPS[quality].map((step, index) =>
    spellAs(tonicMidi + step, LETTERS[(tonicLetter + index) % LETTERS.length] as Letter),
  );
}

/** Which triad sits on each degree, worked out from the scale itself. */
function qualityOf(scale: Note[], degree: number): ChordQuality {
  const root = midiOf(scale[degree]);
  // A third and a fifth built from the scale, wrapping an octave as needed.
  const third = midiOf(scale[(degree + 2) % 7]);
  const fifth = midiOf(scale[(degree + 4) % 7]);
  const thirdGap = ((third - root) % 12 + 12) % 12;
  const fifthGap = ((fifth - root) % 12 + 12) % 12;

  if (fifthGap === 6) return "diminished";
  return thirdGap === 4 ? "major" : "minor";
}

/**
 * The seven chords of a key, in order.
 *
 * Pass a minor key and you get i ii° III iv v VI VII — the same seven chords
 * as its relative major, started three degrees later, which is exactly why
 * A minor and C major share every chord.
 */
export function diatonicChords(
  tonic: Note,
  quality: "major" | "minor",
): DiatonicChord[] {
  const scale = scaleNotes(tonic, quality);
  return scale.map((note, index) => {
    const chordQuality = qualityOf(scale, index);
    const numeral = NUMERALS[index];
    return {
      degree: index + 1,
      numeral:
        chordQuality === "major"
          ? numeral
          : `${numeral.toLowerCase()}${chordQuality === "diminished" ? "°" : ""}`,
      chord: buildChord(note, chordQuality),
    };
  });
}

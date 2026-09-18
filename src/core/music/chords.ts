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

import { LETTERS, letterSemitones, midiOf, noteFromMidi, spellAs } from "./notes.ts";
import type { Letter, Note } from "./types.ts";

/**
 * Diminished is here for diatonic harmony rather than for the chord browser:
 * the seventh chord of any major key is diminished, and a scale that skipped
 * it would be a lie. Nothing offers it as a choice yet.
 */
export type ChordQuality = "major" | "minor" | "diminished";

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
  diminished: [
    { semitones: 0, letterStep: 0, degree: "1" },
    { semitones: 3, letterStep: 2, degree: "♭3" },
    { semitones: 6, letterStep: 4, degree: "♭5" },
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
const SUFFIX: Record<ChordQuality, string> = { major: "", minor: "m", diminished: "°" };

function accidentalText(note: Note): string {
  return note.accidental === 1
    ? "♯"
    : note.accidental === -1
      ? "♭"
      : note.accidental === 2
        ? // The traditional double-sharp glyph is U+1D12A, which most fonts
          // do not carry and render as a blank box. An × is what engravers
          // used before it existed and what chord charts still print.
          "×"
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

/**
 * How a root should be named when its pitch could be spelled either way.
 *
 * `conventional` is what guitarists actually write, and it mixes the two:
 * E♭ and C♯, not D♯ and D♭. That inconsistency is not sloppiness — it is
 * each key being called by the name that needs fewest accidentals — but
 * someone who wants one or the other throughout should be able to say so.
 */
export type RootSpelling = "conventional" | "sharp" | "flat";

const ROOT_NAMES: Record<RootSpelling, ReadonlyArray<readonly [Letter, -1 | 0 | 1]>> = {
  conventional: [
    ["C", 0], ["C", 1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
  ],
  sharp: [
    ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
  ],
  flat: [
    ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
  ],
};

/**
 * Build a root from a pitch class.
 *
 * Only the root's own name is chosen here. Everything else follows from it
 * by letter-stepping, which is why asking for sharps throughout produces
 * D♯ major as D♯ F𝄪 A♯ — the third of a D♯ chord has to be some kind of F,
 * and the F that sounds right is a double sharp. That is the honest answer,
 * and the reason the conventional naming calls that key E♭ instead.
 */
export function rootFromPitchClass(
  pitchClass: number,
  octave = 4,
  spelling: RootSpelling = "conventional",
): Note {
  const [letter, accidental] = ROOT_NAMES[spelling][((pitchClass % 12) + 12) % 12];
  const midi = (octave + 1) * 12 + letterSemitones(letter) + accidental;
  return spellAs(midi, letter);
}

/**
 * Re-spell a note for display under the chosen preference.
 *
 * This is presentation, not theory. A chord's own spelling is fixed by what
 * the chord is — D major's third is a kind of F — but someone reading the
 * diagram may want every accidental shown the same way, and both names
 * refer to the same sound. Callers that print a note use this; nothing that
 * reasons about harmony does.
 *
 * It also quietly disposes of the double accidentals: D♯ major's F× is a G
 * by pitch, so in sharp display it simply reads G.
 */
export function respell(note: Note, spelling: RootSpelling): Note {
  if (spelling === "conventional") return note;
  return noteFromMidi(midiOf(note), spelling);
}

/** Whether display spelling would show this note under a different name. */
export function isRespelled(note: Note, spelling: RootSpelling): boolean {
  const shown = respell(note, spelling);
  return shown.letter !== note.letter || shown.accidental !== note.accidental;
}

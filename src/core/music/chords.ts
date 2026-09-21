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
 * it would be a lie. It is the one quality the browser does not offer.
 *
 * The names are spelled out rather than written as players write them —
 * `dominant7`, not `7` — because a type whose members are "7", "9" and "5"
 * reads like a number somewhere else in the file. What players write is the
 * suffix, below.
 */
export type ChordQuality =
  | "power"
  | "major"
  | "minor"
  | "diminished"
  | "sus2"
  | "sus4"
  | "dominant7"
  | "major7"
  | "minor7"
  | "add9"
  | "dominant9"
  | "dominant7sharp9";

/**
 * Semitones above the root for each degree, and how far to step the letter.
 *
 * The letter step is what makes the spelling right: the third is always two
 * letters up whether it is major or minor, so C's third is some kind of E and
 * never any kind of D or F.
 */
const ROOT = { semitones: 0, letterStep: 0, degree: "1" } as const;
const MAJOR_THIRD = { semitones: 4, letterStep: 2, degree: "3" } as const;
const MINOR_THIRD = { semitones: 3, letterStep: 2, degree: "♭3" } as const;
const FIFTH = { semitones: 7, letterStep: 4, degree: "5" } as const;
const FLAT_SEVENTH = { semitones: 10, letterStep: 6, degree: "♭7" } as const;

const DEGREES: Record<ChordQuality, ReadonlyArray<{ semitones: number; letterStep: number; degree: string }>> = {
  power: [ROOT, FIFTH],
  major: [ROOT, MAJOR_THIRD, FIFTH],
  minor: [ROOT, MINOR_THIRD, FIFTH],
  diminished: [
    ROOT,
    MINOR_THIRD,
    { semitones: 6, letterStep: 4, degree: "♭5" },
  ],
  // Suspended: the third steps aside, to the note below it or the note
  // above. Nothing is left to say whether the chord is happy or sad, which
  // is the whole effect.
  sus2: [ROOT, { semitones: 2, letterStep: 1, degree: "2" }, FIFTH],
  sus4: [ROOT, { semitones: 5, letterStep: 3, degree: "4" }, FIFTH],
  dominant7: [ROOT, MAJOR_THIRD, FIFTH, FLAT_SEVENTH],
  major7: [ROOT, MAJOR_THIRD, FIFTH, { semitones: 11, letterStep: 6, degree: "7" }],
  minor7: [ROOT, MINOR_THIRD, FIFTH, FLAT_SEVENTH],
  // A ninth is a second an octave up, so it keeps the second's letter — and
  // `add9` means exactly that: a triad with the note added, no seventh.
  add9: [ROOT, MAJOR_THIRD, FIFTH, { semitones: 14, letterStep: 1, degree: "9" }],
  dominant9: [
    ROOT,
    MAJOR_THIRD,
    FIFTH,
    FLAT_SEVENTH,
    { semitones: 14, letterStep: 1, degree: "9" },
  ],
  /*
   * The Hendrix chord. Its ♯9 sounds the same as the minor third — in C, a
   * D♯ against an E — and letter-stepping is what keeps that on the page:
   * the ninth is a kind of D whatever it is doing, so it is D♯ and not E♭,
   * which is why the chord looks as strange as it sounds.
   */
  dominant7sharp9: [
    ROOT,
    MAJOR_THIRD,
    FIFTH,
    FLAT_SEVENTH,
    { semitones: 15, letterStep: 1, degree: "♯9" },
  ],
};

export interface ChordTone {
  note: Note;
  /** "1", "♭3", "5", "♭7", "♯9" — what this note is doing in the chord. */
  degree: string;
}

export interface Chord {
  root: Note;
  quality: ChordQuality;
  /** Root, third, fifth, then anything above — in that order, spelled. */
  tones: ChordTone[];
  /** "C", "Cm", "F♯m7", "C7♯9". */
  symbol: string;
}

/** How the quality is written after the root. */
const SUFFIX: Record<ChordQuality, string> = {
  power: "5",
  major: "",
  minor: "m",
  diminished: "°",
  sus2: "sus2",
  sus4: "sus4",
  dominant7: "7",
  major7: "maj7",
  minor7: "m7",
  add9: "add9",
  dominant9: "9",
  dominant7sharp9: "7♯9",
};

/**
 * The qualities the chord browser offers, in the order it offers them.
 *
 * Major and minor lead because they are most of what anyone plays;
 * everything after is roughly in the order a player meets it. Diminished is
 * absent on purpose — it belongs to the key rather than to the browser, and
 * a guitarist reaching for one is reaching for a seventh chord.
 */
export const BROWSABLE_QUALITIES: ReadonlyArray<{ quality: ChordQuality; label: string }> = [
  { quality: "major", label: "Major" },
  { quality: "minor", label: "Minor" },
  { quality: "power", label: "5" },
  { quality: "dominant7", label: "7" },
  { quality: "major7", label: "maj7" },
  { quality: "minor7", label: "m7" },
  { quality: "sus2", label: "sus2" },
  { quality: "sus4", label: "sus4" },
  { quality: "add9", label: "add9" },
  { quality: "dominant9", label: "9" },
  { quality: "dominant7sharp9", label: "7♯9" },
];

/**
 * Which key a chord is read against.
 *
 * The scale row needs a major or a minor key, and most of these qualities
 * are neither on their own. A dominant seventh belongs to the major key on
 * its root as far as a guitarist is concerned — C7 in the key of C — and a
 * suspended or power chord has no third to argue either way, so major is
 * the useful default. Only the ones with a flattened third read as minor.
 */
export function keyQualityOf(quality: ChordQuality): "major" | "minor" {
  return quality === "minor" || quality === "minor7" || quality === "diminished"
    ? "minor"
    : "major";
}

/**
 * The tones a voicing has to sound to count as this chord.
 *
 * The fifth is the one note a guitarist drops, and past a triad it is
 * dropped as a matter of course: the standard 9th chord on the middle four
 * strings has no fifth in it at all. It adds nothing the root has not
 * already said, while the third and the seventh are what make the chord
 * that chord. In a triad there is nothing to spare, and in a power chord
 * the fifth is the entire idea.
 */
export function essentialTones(chord: Chord): ChordTone[] {
  if (chord.tones.length <= 3) return chord.tones;
  return chord.tones.filter((tone) => tone.degree !== "5");
}

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

/** Build a chord on a spelled root. */
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

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
 * Every interval a chord in this library can stack, by the name a chart
 * gives it.
 *
 * Two numbers each: how far above the root it sounds, and how far up the
 * alphabet its letter sits. The letter step is what makes the spelling
 * right — a ninth is a second an octave up, so it takes the second's letter
 * whatever accidental that needs, which is why C7♯9 is D♯ and not E♭ with
 * the E still underneath it.
 */
const INTERVALS = {
  "1": { semitones: 0, letterStep: 0 },
  "2": { semitones: 2, letterStep: 1 },
  "♭3": { semitones: 3, letterStep: 2 },
  "3": { semitones: 4, letterStep: 2 },
  "4": { semitones: 5, letterStep: 3 },
  "♭5": { semitones: 6, letterStep: 4 },
  "5": { semitones: 7, letterStep: 4 },
  "♯5": { semitones: 8, letterStep: 4 },
  "6": { semitones: 9, letterStep: 5 },
  "♭♭7": { semitones: 9, letterStep: 6 },
  "♭7": { semitones: 10, letterStep: 6 },
  "7": { semitones: 11, letterStep: 6 },
  "♭9": { semitones: 13, letterStep: 1 },
  "9": { semitones: 14, letterStep: 1 },
  "♯9": { semitones: 15, letterStep: 1 },
  "11": { semitones: 17, letterStep: 3 },
  "♯11": { semitones: 18, letterStep: 3 },
  "13": { semitones: 21, letterStep: 5 },
} as const;

export type Degree = keyof typeof INTERVALS;

interface QualitySpec {
  /** The degrees it stacks, in order, space-separated. */
  degrees: string;
  /** What a chart prints after the root. */
  suffix: string;
  /** Whether it belongs in the short list most players want. */
  common?: true;
}

/**
 * The whole vocabulary, written the way a chord chart writes it.
 *
 * A table rather than fifty functions, because every one of these is the
 * same operation — stack these degrees on that root — and the only thing
 * that differs is which degrees. The type of `ChordQuality` is derived from
 * the keys, so adding a row here is the entire change.
 *
 * `common` marks the shortlist. Fifty qualities is the right number to
 * *have* and the wrong number to show someone looking for A minor.
 */
const QUALITIES = {
  major: { degrees: "1 3 5", suffix: "", common: true },
  minor: { degrees: "1 ♭3 5", suffix: "m", common: true },
  power: { degrees: "1 5", suffix: "5", common: true },
  dominant7: { degrees: "1 3 5 ♭7", suffix: "7", common: true },
  major7: { degrees: "1 3 5 7", suffix: "maj7", common: true },
  minor7: { degrees: "1 ♭3 5 ♭7", suffix: "m7", common: true },
  sus2: { degrees: "1 2 5", suffix: "sus2", common: true },
  sus4: { degrees: "1 4 5", suffix: "sus4", common: true },
  add9: { degrees: "1 3 5 9", suffix: "add9", common: true },
  dominant9: { degrees: "1 3 5 ♭7 9", suffix: "9", common: true },
  dominant7sharp9: { degrees: "1 3 5 ♭7 ♯9", suffix: "7♯9", common: true },

  diminished: { degrees: "1 ♭3 ♭5", suffix: "dim", common: true },
  diminished7: { degrees: "1 ♭3 ♭5 ♭♭7", suffix: "dim7", common: true },
  augmented: { degrees: "1 3 ♯5", suffix: "aug", common: true },
  sixth: { degrees: "1 3 5 6", suffix: "6", common: true },
  minor6: { degrees: "1 ♭3 5 6", suffix: "m6", common: true },
  dominant7sus4: { degrees: "1 4 5 ♭7", suffix: "7sus4", common: true },
  major9: { degrees: "1 3 5 7 9", suffix: "maj9", common: true },
  minor9: { degrees: "1 ♭3 5 ♭7 9", suffix: "m9", common: true },
  minor7flat5: { degrees: "1 ♭3 ♭5 ♭7", suffix: "m7♭5", common: true },

  major11: { degrees: "1 3 5 7 9 11", suffix: "maj11" },
  major13: { degrees: "1 3 5 7 9 13", suffix: "maj13" },
  major9sharp11: { degrees: "1 3 5 7 9 ♯11", suffix: "maj9♯11" },
  major13sharp11: { degrees: "1 3 5 7 9 ♯11 13", suffix: "maj13♯11" },
  major7flat5: { degrees: "1 3 ♭5 7", suffix: "maj7♭5" },
  major7sharp5: { degrees: "1 3 ♯5 7", suffix: "maj7♯5" },
  majorflat5: { degrees: "1 3 ♭5", suffix: "(♭5)" },
  six9: { degrees: "1 3 5 6 9", suffix: "6add9" },
  sus2sus4: { degrees: "1 2 4 5", suffix: "sus2sus4" },

  minoradd9: { degrees: "1 ♭3 5 9", suffix: "madd9" },
  minor6add9: { degrees: "1 ♭3 5 6 9", suffix: "m6add9" },
  minor11: { degrees: "1 ♭3 5 ♭7 9 11", suffix: "m11" },
  minor13: { degrees: "1 ♭3 5 ♭7 9 13", suffix: "m13" },
  minormajor7: { degrees: "1 ♭3 5 7", suffix: "mmaj7" },
  minormajor9: { degrees: "1 ♭3 5 7 9", suffix: "mmaj9" },
  minor7sharp5: { degrees: "1 ♭3 ♯5 ♭7", suffix: "m7♯5" },

  dominant11: { degrees: "1 3 5 ♭7 9 11", suffix: "11" },
  dominant13: { degrees: "1 3 5 ♭7 9 13", suffix: "13" },
  dominant7flat5: { degrees: "1 3 ♭5 ♭7", suffix: "7♭5" },
  dominant7sharp5: { degrees: "1 3 ♯5 ♭7", suffix: "7♯5" },
  dominant7flat9: { degrees: "1 3 5 ♭7 ♭9", suffix: "7♭9" },
  dominant7flat5flat9: { degrees: "1 3 ♭5 ♭7 ♭9", suffix: "7(♭5,♭9)" },
  dominant7flat5sharp9: { degrees: "1 3 ♭5 ♭7 ♯9", suffix: "7(♭5,♯9)" },
  dominant7sharp5flat9: { degrees: "1 3 ♯5 ♭7 ♭9", suffix: "7(♯5,♭9)" },
  dominant7sharp5sharp9: { degrees: "1 3 ♯5 ♭7 ♯9", suffix: "7(♯5,♯9)" },
  dominant9flat5: { degrees: "1 3 ♭5 ♭7 9", suffix: "9♭5" },
  dominant9sharp5: { degrees: "1 3 ♯5 ♭7 9", suffix: "9♯5" },
  dominant13sharp11: { degrees: "1 3 5 ♭7 9 ♯11 13", suffix: "13♯11" },
  dominant13flat9: { degrees: "1 3 5 ♭7 ♭9 13", suffix: "13♭9" },
  dominant11flat9: { degrees: "1 3 5 ♭7 ♭9 11", suffix: "11♭9" },
} as const satisfies Record<string, QualitySpec>;

/**
 * Diminished is also here for diatonic harmony rather than for the browser:
 * the seventh chord of any major key is diminished, and a scale that
 * skipped it would be a lie.
 */
export type ChordQuality = keyof typeof QUALITIES;

export const CHORD_QUALITIES = Object.keys(QUALITIES) as ChordQuality[];

/** The table row for a quality, widened so its optional fields are readable. */
const specOf = (quality: ChordQuality): QualitySpec => QUALITIES[quality];

/** The degrees a quality stacks, resolved from the table. */
function degreesOf(quality: ChordQuality): Degree[] {
  return specOf(quality).degrees.split(" ") as Degree[];
}

export interface ChordTone {
  note: Note;
  /** "1", "♭3", "5", "♭7", "♯9" — what this note is doing in the chord. */
  degree: Degree;
}

export interface Chord {
  root: Note;
  quality: ChordQuality;
  /** Root, third, fifth, then anything above — in that order, spelled. */
  tones: ChordTone[];
  /**
   * The note that must be lowest, for a slash chord. Null for everything
   * else, which is the ordinary case of the root being in the bass.
   */
  bass: Note | null;
  /** "C", "Cm", "F♯m7", "C7♯9", "G/D". */
  symbol: string;
}

/**
 * The qualities the chord browser offers, in the order it offers them.
 *
 * Major and minor lead because they are most of what anyone plays;
 * everything after is roughly in the order a player meets it.
 */
export const BROWSABLE_QUALITIES: ReadonlyArray<{
  quality: ChordQuality;
  label: string;
  common: boolean;
}> = CHORD_QUALITIES.map((quality) => ({
  quality,
  // The suffix is the label, except for the two chords whose suffix is
  // nothing and a lowercase m.
  label:
    quality === "major" ? "Major" : quality === "minor" ? "Minor" : QUALITIES[quality].suffix,
  common: specOf(quality).common === true,
}));

/**
 * Which key a chord is read against.
 *
 * The scale row needs a major or a minor key, and most of these qualities
 * are neither on their own. A dominant seventh belongs to the major key on
 * its root as far as a guitarist is concerned — C7 in the key of C — and a
 * suspended or power chord has no third to argue either way, so major is
 * the useful default. Anything with a flattened third reads as minor.
 */
export function keyQualityOf(quality: ChordQuality): "major" | "minor" {
  return degreesOf(quality).includes("♭3") ? "minor" : "major";
}

/**
 * How badly a voicing needs each note, highest first.
 *
 * Guitarists drop notes from big chords because six strings and four
 * fingers cannot hold seven of them, and which note goes is not arbitrary.
 * The root says what the chord is built on, the third whether it is happy
 * or sad, the seventh what family it belongs to, and an altered note is
 * usually the entire reason the chord was chosen. The perfect fifth adds
 * nothing any of those have not said, so it goes first.
 */
const PRIORITY: Record<Degree, number> = {
  "1": 100,
  "3": 90,
  "♭3": 90,
  "2": 88,
  "4": 88,
  "7": 80,
  "♭7": 80,
  "♭♭7": 80,
  "♭5": 75,
  "♯5": 75,
  "♭9": 70,
  "♯9": 70,
  "♯11": 70,
  "6": 65,
  "13": 60,
  "11": 50,
  "9": 45,
  "5": 10,
};

/**
 * The tones a voicing has to sound to count as this chord.
 *
 * Two things come out: the perfect fifth, once there is anything above a
 * triad — the standard 9th chord, x5455x, has no fifth in it at all — and
 * any natural extension that a higher one has superseded. A 13th chord is
 * named for its thirteenth; the ninth underneath is filling, and the first
 * thing to go when the hand runs out of fingers.
 */
export function essentialTones(chord: Chord): ChordTone[] {
  const degrees = chord.tones.map((tone) => tone.degree);
  const superseded = new Set<Degree>();
  if (degrees.includes("13")) {
    superseded.add("9");
    superseded.add("11");
  } else if (degrees.includes("11")) {
    superseded.add("9");
  }
  return chord.tones.filter((tone) => {
    if (superseded.has(tone.degree)) return false;
    if (tone.degree === "5" && chord.tones.length > 3) return false;
    return true;
  });
}

/**
 * Essential tones in the order a voicing should give them up — least
 * important first.
 *
 * A seven-note chord has no six-string voicing inside one hand span, so the
 * search has to be allowed to fail downwards rather than return nothing.
 * The root and the third are last out, and in practice never go.
 */
export function tonesByImportance(chord: Chord): ChordTone[] {
  return [...essentialTones(chord)].sort(
    (a, b) => PRIORITY[a.degree] - PRIORITY[b.degree],
  );
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

/**
 * Build a chord on a spelled root.
 *
 * `bass` makes it a slash chord: the same notes, but with a named note
 * required underneath. It may be a note of the chord — G/D is a G triad
 * standing on its own fifth — or a note from outside it, which is what C/F
 * is, and the reason a slash chord is not just an inversion.
 */
export function buildChord(
  root: Note,
  quality: ChordQuality,
  bass: Note | null = null,
): Chord {
  const rootMidi = midiOf(root);
  const rootLetterIndex = LETTERS.indexOf(root.letter);

  const tones = degreesOf(quality).map((degree) => {
    const { semitones, letterStep } = INTERVALS[degree];
    const letter = LETTERS[(rootLetterIndex + letterStep) % LETTERS.length] as Letter;
    return { note: spellAs(rootMidi + semitones, letter), degree };
  });

  const name = `${rootName(root)}${specOf(quality).suffix}`;
  return {
    root,
    quality,
    tones,
    bass,
    symbol: bass === null ? name : `${name}/${rootName(bass)}`,
  };
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

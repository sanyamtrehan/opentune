/**
 * Scales, and the chords that belong to a key.
 *
 * Play a scale, stack a third and a fifth on each note using only notes from
 * that scale, and a chord falls out of every degree — seven of them, in an
 * order that is the same in every key. That pattern is why chord progressions
 * in a key sound like they belong together, and it is the first piece of
 * theory that explains something a player has already noticed.
 *
 * The Roman numerals carry the qualities: uppercase is major, lowercase is
 * minor, a lowercase numeral with a ring is diminished and an uppercase one
 * with a plus is augmented. So a major key is always I ii iii IV V vi vii°,
 * whatever key it is, and harmonic minor is always i ii° III+ iv V VI vii°.
 */

import { buildChord, rootFromPitchClass, rootName } from "./chords.ts";
import type { Chord, ChordQuality } from "./chords.ts";
import { LETTERS, letterSemitones, midiOf, spellAs } from "./notes.ts";
import type { Letter, Note } from "./types.ts";

/**
 * The scales the app knows.
 *
 * `major` and `minor` are the modes a player meets first, and they keep those
 * names rather than Ionian and Aeolian because that is what everyone calls
 * them. The other five modes are the same seven notes started somewhere else;
 * the two altered minors are not — they raise degrees the key signature does
 * not contain, which is exactly what gives them their sound.
 */
export type ScaleName =
  | "major"
  | "minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian"
  | "harmonic-minor"
  | "melodic-minor";

export interface ScaleSpec {
  id: ScaleName;
  /** How it is labelled in the UI. */
  name: string;
  /** Semitones above the tonic. Always seven — see `scaleNotes`. */
  steps: readonly number[];
  /**
   * Which degree of the major scale this is, 0-6, or null for a scale that
   * is not a mode of the major scale at all. Harmonic and melodic minor are
   * the nulls: no major scale holds A minor's notes *and* a G♯, which is
   * exactly why they sound like neither of the scales they sit between.
   */
  modeOf: number | null;
  /**
   * What makes it itself, said against the major or minor scale it is nearest
   * to. This is the parallel comparison rather than the relative one: Dorian
   * is "minor with a raised 6th", not "the white notes from D". The relative
   * view is how you find a mode on the neck; the parallel view is how you
   * hear it, and hearing it is the point of the browser.
   */
  hint: string;
}

/**
 * Listed in the order the selector shows them: the two everyone knows, then
 * the remaining modes, then the two altered minors. Modal order (Ionian
 * through Locrian) would be tidier and would bury Minor in sixth place.
 */
export const SCALES: Record<ScaleName, ScaleSpec> = {
  major: {
    id: "major",
    modeOf: 0,
    name: "Major",
    steps: [0, 2, 4, 5, 7, 9, 11],
    hint: "The one everything else is measured against",
  },
  minor: {
    id: "minor",
    modeOf: 5,
    name: "Minor",
    steps: [0, 2, 3, 5, 7, 8, 10],
    hint: "Natural minor — the same notes as its relative major",
  },
  dorian: {
    id: "dorian",
    modeOf: 1,
    name: "Dorian",
    steps: [0, 2, 3, 5, 7, 9, 10],
    hint: "Minor with a raised 6th — minor, but hopeful",
  },
  phrygian: {
    id: "phrygian",
    modeOf: 2,
    name: "Phrygian",
    steps: [0, 1, 3, 5, 7, 8, 10],
    hint: "Minor with a ♭2 — Spanish, and metal's favourite",
  },
  lydian: {
    id: "lydian",
    modeOf: 3,
    name: "Lydian",
    steps: [0, 2, 4, 6, 7, 9, 11],
    hint: "Major with a ♯4 — floating, filmic",
  },
  mixolydian: {
    id: "mixolydian",
    modeOf: 4,
    name: "Mixolydian",
    steps: [0, 2, 4, 5, 7, 9, 10],
    hint: "Major with a ♭7 — the major scale of blues and rock",
  },
  locrian: {
    id: "locrian",
    modeOf: 6,
    name: "Locrian",
    steps: [0, 1, 3, 5, 6, 8, 10],
    hint: "Minor with a ♭2 and a ♭5 — no stable home chord",
  },
  "harmonic-minor": {
    id: "harmonic-minor",
    modeOf: null,
    name: "Harmonic minor",
    steps: [0, 2, 3, 5, 7, 8, 11],
    hint: "Minor with a raised 7th, so the V chord finally pulls home",
  },
  "melodic-minor": {
    id: "melodic-minor",
    modeOf: null,
    name: "Melodic minor",
    steps: [0, 2, 3, 5, 7, 9, 11],
    hint: "Raised 6th and 7th, smoothing harmonic minor's three-semitone gap",
  },
};

/** Selector order. `Object.keys` already gives it, but typed and explicit. */
export const SCALE_NAMES = Object.keys(SCALES) as ScaleName[];

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

export interface DiatonicChord {
  /** "I", "ii", "vii°", "III+" — cased and marked for the chord's quality. */
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
 *
 * This works for any seven-note scale and only for a seven-note scale. There
 * are seven letters, so a five-note scale has no letter-per-degree spelling
 * to find and the pentatonics cannot be expressed here. That is a different
 * representation, not another row in `SCALES`.
 */
export function scaleNotes(tonic: Note, scale: ScaleName): Note[] {
  const tonicMidi = midiOf(tonic);
  const tonicLetter = LETTERS.indexOf(tonic.letter);
  return SCALES[scale].steps.map((step, index) =>
    spellAs(tonicMidi + step, LETTERS[(tonicLetter + index) % LETTERS.length] as Letter),
  );
}

/**
 * How hard a spelling is to read: accidentals, with the doubles punished.
 *
 * A double accidental is worse than twice as bad as a single one. Nobody
 * reading a diagram wants to work out that E𝄫 is a D, and the weighting is
 * what keeps that name off the screen.
 */
function spellingCost(notes: Note[]): number {
  return notes.reduce(
    (total, note) => total + Math.abs(note.accidental) * (Math.abs(note.accidental) === 2 ? 3 : 1),
    0,
  );
}

/** The two names a pitch class can go by, sharp first. */
function candidateRoots(pitchClass: number, octave: number): Note[] {
  const pc = ((pitchClass % 12) + 12) % 12;
  const sharp: readonly [Letter, number][] = [
    ["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0],
    ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0],
  ];
  const flat: readonly [Letter, number][] = [
    ["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0],
    ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0],
  ];
  const spell = ([letter, accidental]: readonly [Letter, number]) =>
    spellAs((octave + 1) * 12 + letterSemitones(letter) + accidental, letter);
  return [spell(sharp[pc]), spell(flat[pc])];
}

/**
 * What to call the root of a scale on a given pitch class.
 *
 * The root's name is the only choice there is — every other note follows from
 * it by letter-stepping — and it is the choice that decides whether the scale
 * reads like music or like a puzzle. Pitch class 1 under Phrygian is the case
 * that shows why:
 *
 *     D♭ E𝄫 F♭ G♭ A♭ B𝄫 C♭      legal, and nobody writes it
 *     C♯ D  E  F♯ G♯ A  B        what a chart writes
 *
 * So: spell the whole scale both ways and keep the cheaper one. Ties are real
 * — F♯ major and G♭ major are six accidentals each, and both are used — and
 * they fall back to the naming convention for a key with that third, which is
 * the judgement `rootFromPitchClass` already holds.
 *
 * Worth noting that for `major` and `minor` this rule reproduces that hand
 * table exactly, all twenty-four keys. The table is a convention; counting
 * accidentals is the reason behind it.
 */
export function scaleRoot(pitchClass: number, scale: ScaleName, octave = 4): Note {
  const [sharp, flat] = candidateRoots(pitchClass, octave);
  const sharpCost = spellingCost(scaleNotes(sharp, scale));
  const flatCost = spellingCost(scaleNotes(flat, scale));
  if (sharpCost !== flatCost) return sharpCost < flatCost ? sharp : flat;

  // A tie. The third decides which convention to borrow: a scale with a minor
  // third is named the way minor keys are named, which is how pitch class 3
  // stays E♭ minor rather than becoming D♯ minor.
  const minorThird = SCALES[scale].steps[2] === 3;
  return rootFromPitchClass(pitchClass, octave, "conventional", minorThird ? "minor" : "major");
}

/**
 * Whether a scale's notes lean flat.
 *
 * Only used for naming the notes that are *not* in the scale, which have no
 * spelling of their own to follow. B♭ Phrygian should not have a D♯ sitting
 * next to its D♭ on the same diagram.
 */
export function scaleLeansFlat(tonic: Note, scale: ScaleName): boolean {
  return scaleNotes(tonic, scale).reduce((total, note) => total + note.accidental, 0) < 0;
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
  // Harmonic and melodic minor both raise a degree into the third degree's
  // fifth, which makes a chord the seven modes never produce. Without this
  // branch it falls through and prints as a plain major.
  if (fifthGap === 8 && thirdGap === 4) return "augmented";
  return thirdGap === 4 ? "major" : "minor";
}

/**
 * The seven chords of a key, in order.
 *
 * Pass a minor key and you get i ii° III iv v VI VII — the same seven chords
 * as its relative major, started three degrees later, which is exactly why
 * A minor and C major share every chord. The other modes are that same fact
 * again, rotated further; harmonic and melodic minor are not, and their III+
 * is the audible proof.
 */
export function diatonicChords(tonic: Note, scale: ScaleName): DiatonicChord[] {
  const notes = scaleNotes(tonic, scale);
  return notes.map((note, index) => {
    const chordQuality = qualityOf(notes, index);
    const numeral = NUMERALS[index];
    const marked =
      chordQuality === "major"
        ? numeral
        : chordQuality === "augmented"
          ? `${numeral}+`
          : `${numeral.toLowerCase()}${chordQuality === "diminished" ? "°" : ""}`;
    return { degree: index + 1, numeral: marked, chord: buildChord(note, chordQuality) };
  });
}

/**
 * Each degree named against the major scale: Dorian is 1 2 ♭3 4 5 6 ♭7.
 *
 * This is the parallel view written down. The relative view — Dorian is the
 * white notes from D — is how you find a mode on the neck; this is the one
 * that says why it sounds the way it does, because every label here is a
 * comparison against the scale the reader already knows.
 */
export function scaleDegrees(scale: ScaleName): string[] {
  const major = SCALES.major.steps;
  return SCALES[scale].steps.map((step, index) => {
    const shift = step - major[index];
    return `${shift < 0 ? "♭" : shift > 0 ? "♯" : ""}${index + 1}`;
  });
}

export interface ScaleAlteration {
  /** 0-6. */
  index: number;
  /** What this scale calls the degree: "♭2", "♯4". */
  degree: string;
  /** What its parallel major or minor calls it. */
  parentDegree: string;
  direction: "raised" | "lowered";
}

/**
 * What a scale changes about the major or minor scale on the same root.
 *
 * Which of the two it is measured against is decided by the third, because
 * the third is what a listener hears first: a scale with a minor third is a
 * minor scale with something done to it, whatever else is going on. Dorian
 * comes back as one raised 6th rather than as a list of seven intervals,
 * and one changed note is a thing a player can hold on to.
 */
export function scaleAlterations(scale: ScaleName): {
  against: "major" | "minor";
  changes: ScaleAlteration[];
} {
  const against = SCALES[scale].steps[2] === 4 ? "major" : "minor";
  const parent = SCALES[against].steps;
  const degrees = scaleDegrees(scale);
  const parentDegrees = scaleDegrees(against);
  const changes = SCALES[scale].steps.flatMap((step, index) =>
    step === parent[index]
      ? []
      : [{
          index,
          degree: degrees[index],
          parentDegree: parentDegrees[index],
          direction: (step > parent[index] ? "raised" : "lowered") as "raised" | "lowered",
        }],
  );
  return { against, changes };
}

/**
 * The major scale a mode shares every note with, or null if it is not a mode.
 *
 * D Dorian returns C: the relative view, and the practical one, because it
 * is how a player finds the mode on a neck they already know. It is also the
 * half of the story that explains nothing about the sound, which is why
 * `scaleAlterations` exists beside it.
 */
export function parentMajor(tonic: Note, scale: ScaleName): Note | null {
  const degree = SCALES[scale].modeOf;
  if (degree === null) return null;
  const letterIndex = LETTERS.indexOf(tonic.letter);
  return spellAs(
    midiOf(tonic) - SCALES.major.steps[degree],
    LETTERS[(letterIndex - degree + LETTERS.length) % LETTERS.length] as Letter,
  );
}

export interface RootChoice {
  chosen: Note;
  /** The name not used, or null where the pitch class only has one. */
  rejected: Note | null;
  chosenCost: number;
  rejectedCost: number;
}

/**
 * `scaleRoot`'s decision, with its working shown.
 *
 * The browser says out loud why a scale is called what it is — "written C♯
 * rather than D♭, which would need two double flats" — and that sentence
 * needs the name that lost as well as the one that won.
 */
export function scaleRootChoice(pitchClass: number, scale: ScaleName, octave = 4): RootChoice {
  const chosen = scaleRoot(pitchClass, scale, octave);
  const other = candidateRoots(pitchClass, octave).find(
    (note) => note.letter !== chosen.letter || note.accidental !== chosen.accidental,
  );
  return {
    chosen,
    rejected: other ?? null,
    chosenCost: spellingCost(scaleNotes(chosen, scale)),
    rejectedCost: other ? spellingCost(scaleNotes(other, scale)) : 0,
  };
}

/**
 * The five pitches a seven-note scale leaves out, spelled to match it.
 *
 * On the neck these are the outlined dots. Worth naming, because "the scale
 * is seven of the twelve" is the fact that makes a scale a choice rather
 * than a given.
 *
 * Returned climbing from the tonic, like the scale itself, so the two lists
 * read as one octave between them rather than as a set and its complement.
 */
export function notesOutside(tonic: Note, scale: ScaleName): Note[] {
  const inside = new Set(scaleNotes(tonic, scale).map((note) => ((midiOf(note) % 12) + 12) % 12));
  const flat = scaleLeansFlat(tonic, scale);
  const outside: Note[] = [];
  for (let semitone = 0; semitone < 12; semitone++) {
    const pitchClass = (((midiOf(tonic) + semitone) % 12) + 12) % 12;
    if (inside.has(pitchClass)) continue;
    const [sharp, flatName] = candidateRoots(pitchClass, 4);
    outside.push(flat ? flatName : sharp);
  }
  return outside;
}

/**
 * "C major", "D Dorian", "A harmonic minor".
 *
 * The capitalisation is not a detail. Major and minor are descriptions and
 * stay lowercase; the modes are named after places and keep their capital,
 * the way a chart writes them. Built here rather than in each component
 * because three of them say it and they must not disagree.
 */
export function scaleTitle(tonic: Note, scale: ScaleName): string {
  const { name } = SCALES[scale];
  const described = scale === "major" || scale === "minor" || scale.endsWith("-minor");
  return `${rootName(tonic)} ${described ? name.toLowerCase() : name}`;
}

import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSABLE_QUALITIES,
  buildChord,
  essentialTones,
  isRespelled,
  respell,
  rootFromPitchClass,
  rootName,
  toneAt,
} from "./chords.ts";
import { formatNote, midiOf, parseNote } from "./notes.ts";

/** "C E G" — the chord's notes without octaves, for readable assertions. */
function spell(root: string, quality: Parameters<typeof buildChord>[1]): string {
  return buildChord(parseNote(root), quality)
    .tones.map((tone) => rootName(tone.note))
    .join(" ");
}

test("the chords everyone knows", () => {
  assert.equal(spell("C4", "major"), "C E G");
  assert.equal(spell("G4", "major"), "G B D");
  assert.equal(spell("A4", "minor"), "A C E");
  assert.equal(spell("E4", "minor"), "E G B");
  assert.equal(spell("D4", "major"), "D F♯ A");
  assert.equal(spell("F4", "major"), "F A C");
});

test("the third is always a third, whatever accidental it needs", () => {
  /*
   * The reason chords are built by stepping letters rather than by adding
   * semitones. C♯ major's third is four semitones up, which is an F — but it
   * has to be some kind of E, so it is E♯. Add semitones instead and the
   * chord comes out C♯ F A♯: right sounds, wrong notes, and no longer
   * recognisable as a chord.
   */
  assert.equal(spell("C#4", "major"), "C♯ E♯ G♯");
  assert.equal(spell("F#4", "major"), "F♯ A♯ C♯");
  assert.equal(spell("Eb4", "major"), "E♭ G B♭");
  assert.equal(spell("Ab4", "major"), "A♭ C E♭");
  assert.equal(spell("Bb4", "minor"), "B♭ D♭ F");
  assert.equal(spell("Eb4", "minor"), "E♭ G♭ B♭");
});

test("every root spells three different letters, major and minor", () => {
  // A triad uses one each of three letters two apart. If two share a letter
  // the spelling has gone wrong somewhere.
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const quality of ["major", "minor"] as const) {
      const chord = buildChord(rootFromPitchClass(pitchClass), quality);
      const letters = chord.tones.map((tone) => tone.note.letter);
      assert.equal(new Set(letters).size, 3, `${chord.symbol}: ${letters.join("")}`);
      // And no double accidentals, which would mean we picked a silly root.
      for (const tone of chord.tones) {
        assert.ok(
          Math.abs(tone.note.accidental) <= 1,
          `${chord.symbol} needs ${formatNote(tone.note)}`,
        );
      }
    }
  }
});

test("the intervals are right, however they are spelled", () => {
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const [quality, third] of [["major", 4], ["minor", 3]] as const) {
      const chord = buildChord(rootFromPitchClass(pitchClass), quality);
      const [root, mid, fifth] = chord.tones.map((tone) => midiOf(tone.note));
      assert.equal(mid - root, third, `${chord.symbol} third`);
      assert.equal(fifth - root, 7, `${chord.symbol} fifth`);
    }
  }
});

test("minor is major with a flattened third, and says so", () => {
  const major = buildChord(parseNote("C4"), "major");
  const minor = buildChord(parseNote("C4"), "minor");
  assert.deepEqual(major.tones.map((t) => t.degree), ["1", "3", "5"]);
  assert.deepEqual(minor.tones.map((t) => t.degree), ["1", "♭3", "5"]);
  // Root and fifth are untouched.
  assert.equal(formatNote(major.tones[0].note), formatNote(minor.tones[0].note));
  assert.equal(formatNote(major.tones[2].note), formatNote(minor.tones[2].note));
});

test("symbols are what a chart would print", () => {
  assert.equal(buildChord(parseNote("C4"), "major").symbol, "C");
  assert.equal(buildChord(parseNote("A4"), "minor").symbol, "Am");
  assert.equal(buildChord(parseNote("F#4"), "minor").symbol, "F♯m");
  assert.equal(buildChord(parseNote("Bb4"), "major").symbol, "B♭");
});

test("a fretted pitch is named for its role in the chord", () => {
  const c = buildChord(parseNote("C4"), "major");

  // The open C shape, low to high: x C3 E3 G3 C4 E4.
  const shape = ["C3", "E3", "G3", "C4", "E4"].map((text) => midiOf(parseNote(text)));
  const named = shape.map((midi) => toneAt(c, midi));
  assert.deepEqual(
    named.map((tone) => `${formatNote(tone!.note)}(${tone!.degree})`),
    ["C3(1)", "E3(3)", "G3(5)", "C4(1)", "E4(3)"],
  );
});

test("a fretted pitch takes the chord's spelling, not the string's", () => {
  // Four semitones above C♯ is an F by pitch, and must be named E♯ here
  // because that is what the chord calls it.
  const cSharp = buildChord(parseNote("C#4"), "major");
  const tone = toneAt(cSharp, midiOf(parseNote("F4")));
  assert.equal(formatNote(tone!.note), "E#4");
  assert.equal(tone!.degree, "3");
});

test("a pitch outside the chord is reported as such, not guessed at", () => {
  const c = buildChord(parseNote("C4"), "major");
  assert.equal(toneAt(c, midiOf(parseNote("D4"))), null);
  assert.equal(toneAt(c, midiOf(parseNote("Bb3"))), null);
  // Octaves of a chord tone still count.
  assert.equal(toneAt(c, midiOf(parseNote("E2")))?.degree, "3");
});

test("roots are named the way guitarists name them", () => {
  const names = Array.from({ length: 12 }, (_, pitchClass) =>
    rootName(rootFromPitchClass(pitchClass)),
  );
  assert.deepEqual(names, [
    "C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B",
  ]);
});

test("roots can be forced to sharps or flats", () => {
  const names = (spelling: "conventional" | "sharp" | "flat") =>
    Array.from({ length: 12 }, (_, pitchClass) =>
      rootName(rootFromPitchClass(pitchClass, 4, spelling)),
    ).join(" ");

  assert.equal(names("conventional"), "C C♯ D E♭ E F F♯ G A♭ A B♭ B");
  assert.equal(names("sharp"), "C C♯ D D♯ E F F♯ G G♯ A A♯ B");
  assert.equal(names("flat"), "C D♭ D E♭ E F G♭ G A♭ A B♭ B");
});

test("forcing sharps produces the double sharps those keys really have", () => {
  /*
   * Not a defect. The third of a D♯ chord must be some kind of F, and the F
   * that sounds right is F double-sharp. This is exactly why the
   * conventional naming calls that key E♭ — and why the app offers the mix
   * as its default.
   */
  const dSharp = buildChord(rootFromPitchClass(3, 4, "sharp"), "major");
  assert.equal(dSharp.symbol, "D♯");
  assert.deepEqual(dSharp.tones.map((tone) => rootName(tone.note)), ["D♯", "F×", "A♯"]);

  // The same pitches, named the conventional way, need no such thing.
  const eFlat = buildChord(rootFromPitchClass(3, 4, "flat"), "major");
  assert.deepEqual(eFlat.tones.map((tone) => rootName(tone.note)), ["E♭", "G", "B♭"]);
  assert.deepEqual(
    dSharp.tones.map((tone) => midiOf(tone.note)),
    eFlat.tones.map((tone) => midiOf(tone.note)),
    "same sounds either way",
  );
});

test("the spelling choice carries through to the whole key", () => {
  const flat = buildChord(rootFromPitchClass(1, 4, "flat"), "major");
  assert.equal(flat.symbol, "D♭");
  assert.deepEqual(flat.tones.map((tone) => rootName(tone.note)), ["D♭", "F", "A♭"]);

  const sharp = buildChord(rootFromPitchClass(1, 4, "sharp"), "major");
  assert.equal(sharp.symbol, "C♯");
  assert.deepEqual(sharp.tones.map((tone) => rootName(tone.note)), ["C♯", "E♯", "G♯"]);
});

test("display spelling renames notes without changing them", () => {
  const fSharp = parseNote("F#4");
  assert.equal(rootName(respell(fSharp, "conventional")), "F♯");
  assert.equal(rootName(respell(fSharp, "sharp")), "F♯");
  assert.equal(rootName(respell(fSharp, "flat")), "G♭");
  // Same sound throughout: this is presentation, not transposition.
  for (const spelling of ["conventional", "sharp", "flat"] as const) {
    assert.equal(midiOf(respell(fSharp, spelling)), midiOf(fSharp));
  }
});

test("naturals are never re-spelled", () => {
  for (const text of ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]) {
    for (const spelling of ["sharp", "flat"] as const) {
      assert.equal(rootName(respell(parseNote(text), spelling)), text.slice(0, -1));
      assert.equal(isRespelled(parseNote(text), spelling), false);
    }
  }
});

test("display spelling disposes of double accidentals", () => {
  // D♯ major's third is F double-sharp, which is a G by pitch. Asking for
  // sharps throughout shows the G, which is the readable half of the point.
  const chord = buildChord(rootFromPitchClass(3, 4, "sharp"), "major");
  const shown = chord.tones.map((tone) => rootName(respell(tone.note, "sharp")));
  assert.deepEqual(shown, ["D♯", "G", "A♯"]);
  assert.ok(isRespelled(chord.tones[1].note, "sharp"), "the third is renamed");
  assert.ok(!isRespelled(chord.tones[0].note, "sharp"), "the root is not");
});

test("the thing the setting is for: D major's third", () => {
  const chord = buildChord(parseNote("D4"), "major");
  assert.deepEqual(
    chord.tones.map((tone) => rootName(respell(tone.note, "flat"))),
    ["D", "G♭", "A"],
  );
  // And the app can tell that it has done so, in order to say so.
  assert.deepEqual(
    chord.tones.map((tone) => isRespelled(tone.note, "flat")),
    [false, true, false],
  );
});


/** Semitones above the root, for every quality the browser offers. */
const INTERVALS: Record<string, number[]> = {
  power: [0, 7],
  major: [0, 4, 7],
  minor: [0, 3, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  add9: [0, 4, 7, 14],
  dominant9: [0, 4, 7, 10, 14],
  dominant7sharp9: [0, 4, 7, 10, 15],
};

test("every quality sounds the intervals it is named for", () => {
  for (const { quality } of BROWSABLE_QUALITIES) {
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      const root = rootFromPitchClass(pitchClass);
      const chord = buildChord(root, quality);
      assert.deepEqual(
        chord.tones.map((tone) => midiOf(tone.note) - midiOf(root)),
        INTERVALS[quality],
        chord.symbol,
      );
    }
  }
});

test("no chord uses the same letter twice, in any key or any spelling", () => {
  /*
   * The point of letter-stepping, checked across everything at once. A
   * ninth is a second an octave up and takes the second's letter, so it
   * cannot collide with the third — which is exactly why C7♯9 is D♯ and
   * not E♭, with the E still in the chord below it.
   */
  for (const spelling of ["conventional", "sharp", "flat"] as const) {
    for (const { quality } of BROWSABLE_QUALITIES) {
      for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
        const chord = buildChord(rootFromPitchClass(pitchClass, 4, spelling), quality);
        const letters = chord.tones.map((tone) => tone.note.letter);
        assert.equal(
          new Set(letters).size,
          letters.length,
          `${spelling} ${chord.symbol}: ${letters.join("")}`,
        );
        for (const tone of chord.tones) {
          assert.ok(
            Math.abs(tone.note.accidental) <= 2,
            `${chord.symbol} needs a triple accidental on ${tone.note.letter}`,
          );
        }
      }
    }
  }
});

test("the Hendrix chord keeps its third and its sharp ninth apart", () => {
  assert.equal(spell("C4", "dominant7sharp9"), "C E G B♭ D♯");
  // The same sound as an E♭, one letter away from the E sitting under it.
  assert.equal(spell("E4", "dominant7sharp9"), "E G♯ B D F×");
});

test("suffixes are what a chart would print", () => {
  const written = BROWSABLE_QUALITIES.map(
    ({ quality }) => buildChord(parseNote("C4"), quality).symbol,
  );
  assert.deepEqual(written, [
    "C", "Cm", "C5", "C7", "Cmaj7", "Cm7", "Csus2", "Csus4", "Cadd9", "C9", "C7♯9",
  ]);
});

test("the fifth is the note a voicing may drop, and only past a triad", () => {
  const degrees = (quality: Parameters<typeof buildChord>[1]) =>
    essentialTones(buildChord(parseNote("C4"), quality)).map((tone) => tone.degree);

  assert.deepEqual(degrees("major"), ["1", "3", "5"], "a triad has nothing to spare");
  assert.deepEqual(degrees("power"), ["1", "5"], "the fifth is a power chord's whole idea");
  assert.deepEqual(degrees("sus4"), ["1", "4", "5"]);
  assert.deepEqual(degrees("dominant9"), ["1", "3", "♭7", "9"]);
  assert.deepEqual(degrees("major7"), ["1", "3", "7"]);
});

import test from "node:test";
import assert from "node:assert/strict";

import { buildChord, rootFromPitchClass, rootName, toneAt } from "./chords.ts";
import { formatNote, midiOf, parseNote } from "./notes.ts";

/** "C E G" — the chord's notes without octaves, for readable assertions. */
function spell(root: string, quality: "major" | "minor"): string {
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

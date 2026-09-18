import test from "node:test";
import assert from "node:assert/strict";

import { rootName } from "./chords.ts";
import { formatNote, parseNote } from "./notes.ts";
import { diatonicChords, scaleNotes } from "./scales.ts";

const spell = (tonic: string, quality: "major" | "minor") =>
  scaleNotes(parseNote(tonic), quality).map(rootName).join(" ");

const harmony = (tonic: string, quality: "major" | "minor") =>
  diatonicChords(parseNote(tonic), quality)
    .map((entry) => `${entry.numeral}:${entry.chord.symbol}`)
    .join(" ");

test("scales use each letter once", () => {
  assert.equal(spell("C4", "major"), "C D E F G A B");
  assert.equal(spell("G4", "major"), "G A B C D E F♯");
  assert.equal(spell("F4", "major"), "F G A B♭ C D E");
  assert.equal(spell("A4", "minor"), "A B C D E F G");
  assert.equal(spell("E4", "minor"), "E F♯ G A B C D");
});

test("no scale repeats or skips a letter, in any key", () => {
  // The property that letter-stepping buys. Spell by pitch instead and G
  // major's seventh becomes G♭ — two Gs in the scale, and no key signature.
  for (const tonic of ["C4", "G4", "D4", "A4", "E4", "B4", "F#4", "Db4", "Ab4", "Eb4", "Bb4", "F4"]) {
    for (const quality of ["major", "minor"] as const) {
      const letters = scaleNotes(parseNote(tonic), quality).map((note) => note.letter);
      assert.equal(new Set(letters).size, 7, `${tonic} ${quality}: ${letters.join("")}`);
    }
  }
});

test("a major key is always I ii iii IV V vi vii°", () => {
  assert.equal(
    harmony("C4", "major"),
    "I:C ii:Dm iii:Em IV:F V:G vi:Am vii°:B°",
  );
  // Same pattern, different key — which is the point of numerals.
  assert.equal(
    harmony("G4", "major"),
    "I:G ii:Am iii:Bm IV:C V:D vi:Em vii°:F♯°",
  );
});

test("a minor key is i ii° III iv v VI VII", () => {
  assert.equal(
    harmony("A4", "minor"),
    "i:Am ii°:B° III:C iv:Dm v:Em VI:F VII:G",
  );
});

test("a minor key holds the same chords as its relative major", () => {
  // Why A minor and C major feel interchangeable: they are the same seven
  // chords, started three degrees apart.
  const major = diatonicChords(parseNote("C4"), "major").map((e) => e.chord.symbol);
  const minor = diatonicChords(parseNote("A4"), "minor").map((e) => e.chord.symbol);
  assert.deepEqual([...minor].sort(), [...major].sort());
});

test("the qualities follow the same pattern in every key", () => {
  for (const tonic of ["C4", "Db4", "D4", "Eb4", "E4", "F4", "F#4", "G4", "Ab4", "A4", "Bb4", "B4"]) {
    const qualities = diatonicChords(parseNote(tonic), "major").map(
      (entry) => entry.chord.quality,
    );
    assert.deepEqual(
      qualities,
      ["major", "minor", "minor", "major", "major", "minor", "diminished"],
      `${tonic} major`,
    );
  }
});

test("the diminished chord really is diminished", () => {
  const seventh = diatonicChords(parseNote("C4"), "major")[6].chord;
  assert.equal(seventh.symbol, "B°");
  assert.deepEqual(seventh.tones.map((tone) => rootName(tone.note)), ["B", "D", "F"]);
  assert.deepEqual(seventh.tones.map((tone) => tone.degree), ["1", "♭3", "♭5"]);
});

test("every chord in a key is built only from that key's notes", () => {
  for (const tonic of ["C4", "Eb4", "F#4", "B4"]) {
    for (const quality of ["major", "minor"] as const) {
      const scale = new Set(
        scaleNotes(parseNote(tonic), quality).map((note) => formatNote(note).replace(/\d+$/, "")),
      );
      for (const entry of diatonicChords(parseNote(tonic), quality)) {
        for (const tone of entry.chord.tones) {
          const name = formatNote(tone.note).replace(/\d+$/, "");
          assert.ok(
            scale.has(name),
            `${tonic} ${quality}: ${entry.chord.symbol} uses ${name}, not in the scale`,
          );
        }
      }
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import { formatNote, midiOf, parseNote, spellAs } from "../music/notes.ts";
import { spellFromRoot, spellRoot } from "./spelling.ts";

const midi = (text: string) => midiOf(parseNote(text));

test("spellAs reaches a pitch from any workable letter", () => {
  assert.equal(formatNote(spellAs(61, "C")), "C#4");
  assert.equal(formatNote(spellAs(61, "D")), "Db4");
  assert.equal(formatNote(spellAs(60, "B")), "B#3");
  assert.equal(formatNote(spellAs(59, "C")), "Cb4");
  // A letter more than a double accidental away cannot spell the pitch.
  assert.throws(() => spellAs(61, "G"), RangeError);
});

test("spellAs always round-trips to the pitch it was given", () => {
  for (let m = 21; m <= 108; m += 1) {
    for (const letter of ["C", "D", "E", "F", "G", "A", "B"] as const) {
      let note;
      try {
        note = spellAs(m, letter);
      } catch {
        continue; // Out of accidental range for this letter, which is fine.
      }
      assert.equal(midiOf(note), m, `${m} as ${letter}`);
    }
  }
});

test("roots are named the way guitarists name them", () => {
  const names = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((pc) =>
    formatNote(spellRoot(48 + pc)).replace(/\d+$/, ""),
  );
  assert.deepEqual(names, ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]);
});

test("spellRoot keeps the octave the pitch actually sounds in", () => {
  assert.equal(formatNote(spellRoot(midi("Eb2"))), "Eb2");
  assert.equal(formatNote(spellRoot(midi("C#2"))), "C#2");
  assert.equal(formatNote(spellRoot(midi("B1"))), "B1");
});

test("diatonic pitches take their scale spelling", () => {
  // The third of a D chord is F#, not Gb, because D major has an F#.
  const openD = ["D2", "A2", "D3", "F#3", "A3", "D4"].map(midi);
  assert.equal(
    spellFromRoot(openD, openD[0]).map(formatNote).join(" "),
    "D2 A2 D3 F#3 A3 D4",
  );
});

test("chromatic pitches follow the root's own accidental", () => {
  // Eb root leans flat...
  const eb = [39, 44, 49, 54, 58, 63];
  assert.equal(
    spellFromRoot(eb, eb[0]).map(formatNote).join(" "),
    "Eb2 Ab2 Db3 Gb3 Bb3 Eb4",
  );
  // ...and a C# root leans sharp, on the same interval pattern.
  const cSharp = eb.map((m) => m - 2);
  assert.equal(
    spellFromRoot(cSharp, cSharp[0]).map(formatNote).join(" "),
    "C#2 F#2 B2 E3 G#3 C#4",
  );
});

test("a natural root leans flat, which is how C Standard is written", () => {
  const cStandard = [36, 41, 46, 51, 55, 60];
  assert.equal(
    spellFromRoot(cStandard, cStandard[0]).map(formatNote).join(" "),
    "C2 F2 Bb2 Eb3 G3 C4",
  );
});

test("spelling never changes the sounding pitch", () => {
  for (let root = 28; root <= 52; root += 1) {
    const midis = [0, 5, 10, 15, 19, 24].map((interval) => root + interval);
    spellFromRoot(midis, root).forEach((note, index) => {
      assert.equal(midiOf(note), midis[index], `root ${root}, string ${index}`);
    });
  }
});

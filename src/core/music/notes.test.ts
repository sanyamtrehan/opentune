import test from "node:test";
import assert from "node:assert/strict";

import {
  equals,
  formatNote,
  isEnharmonic,
  midiOf,
  noteFromMidi,
  parseNote,
  transpose,
} from "./notes.ts";

test("midiOf places the anchors correctly", () => {
  assert.equal(midiOf(parseNote("C4")), 60);
  assert.equal(midiOf(parseNote("A4")), 69);
  assert.equal(midiOf(parseNote("E2")), 40);
  assert.equal(midiOf(parseNote("C-1")), 0);
});

test("midiOf lets accidentals cross the octave boundary", () => {
  // B#3 is the same key as C4, and Cb4 the same key as B3.
  assert.equal(midiOf(parseNote("B#3")), 60);
  assert.equal(midiOf(parseNote("Cb4")), 59);
  assert.equal(midiOf(parseNote("Bbb3")), 57);
});

test("enharmonics sound alike but are not equal", () => {
  const fSharp = parseNote("F#4");
  const gFlat = parseNote("Gb4");
  assert.ok(isEnharmonic(fSharp, gFlat));
  assert.ok(!equals(fSharp, gFlat));
  assert.ok(equals(fSharp, parseNote("F#4")));
});

test("noteFromMidi honours the spelling preference", () => {
  assert.equal(formatNote(noteFromMidi(66, "sharp")), "F#4");
  assert.equal(formatNote(noteFromMidi(66, "flat")), "Gb4");
  // Naturals are unambiguous either way.
  assert.equal(formatNote(noteFromMidi(60, "flat")), "C4");
});

test("transpose moves by semitones and re-spells", () => {
  assert.equal(formatNote(transpose(parseNote("E2"), -2)), "D2");
  assert.equal(formatNote(transpose(parseNote("E2"), -1, "flat")), "Eb2");
  assert.equal(formatNote(transpose(parseNote("E2"), -1, "sharp")), "D#2");
  assert.equal(formatNote(transpose(parseNote("B3"), 1)), "C4");
});

test("parseNote round-trips through formatNote", () => {
  for (const text of ["C4", "F#2", "Eb4", "Bbb3", "G##5", "A0", "C-1"]) {
    assert.equal(formatNote(parseNote(text)), text);
  }
});

test("parseNote rejects nonsense", () => {
  for (const text of ["H4", "C", "4C", "C#b4", "", "C4.5"]) {
    assert.throws(() => parseNote(text), { name: "Error" }, text);
  }
});

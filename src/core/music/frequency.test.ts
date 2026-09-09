import test from "node:test";
import assert from "node:assert/strict";

import { formatNote, parseNote } from "./notes.ts";
import {
  centsBetween,
  centsFromNote,
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
  noteToFrequency,
} from "./frequency.ts";

/** Published frequencies for standard tuning at A4 = 440. */
const STANDARD_AT_440: ReadonlyArray<readonly [string, number]> = [
  ["E2", 82.41],
  ["A2", 110.0],
  ["D3", 146.83],
  ["G3", 196.0],
  ["B3", 246.94],
  ["E4", 329.63],
];

test("standard tuning matches published frequencies at A4=440", () => {
  for (const [text, expected] of STANDARD_AT_440) {
    const actual = noteToFrequency(parseNote(text));
    assert.ok(
      Math.abs(actual - expected) < 0.01,
      `${text}: expected ~${expected} Hz, got ${actual}`,
    );
  }
});

test("A4 is exactly the reference pitch, whatever it is set to", () => {
  const a4 = parseNote("A4");
  for (const reference of [440, 432, 442, 415]) {
    assert.equal(noteToFrequency(a4, reference), reference);
  }
});

test("the reference pitch scales every note, not just A", () => {
  // 432 is 440 flattened by the same ratio everywhere.
  const ratio = 432 / 440;
  const e2 = parseNote("E2");
  assert.ok(
    Math.abs(noteToFrequency(e2, 432) - noteToFrequency(e2, 440) * ratio) < 1e-9,
  );
  // A well-known consequence: at A4=432, low E lands near 80.91 Hz.
  assert.ok(Math.abs(noteToFrequency(e2, 432) - 80.909) < 0.01);
});

test("octaves double, semitones are the twelfth root of two", () => {
  assert.ok(
    Math.abs(noteToFrequency(parseNote("A5")) - 880) < 1e-9,
  );
  assert.ok(
    Math.abs(noteToFrequency(parseNote("A3")) - 220) < 1e-9,
  );
  const ratio = noteToFrequency(parseNote("A#4")) / 440;
  assert.ok(Math.abs(ratio - 2 ** (1 / 12)) < 1e-12);
});

test("frequencyToMidi inverts midiToFrequency", () => {
  for (const reference of [440, 432, 415]) {
    for (let midi = 21; midi <= 108; midi += 1) {
      const round = frequencyToMidi(midiToFrequency(midi, reference), reference);
      assert.ok(Math.abs(round - midi) < 1e-9, `midi ${midi} @ ${reference}`);
    }
  }
});

test("centsBetween measures the intervals we care about", () => {
  assert.ok(Math.abs(centsBetween(880, 440) - 1200) < 1e-9);
  assert.ok(Math.abs(centsBetween(440, 880) + 1200) < 1e-9);
  assert.equal(centsBetween(440, 440), 0);
  // A semitone is 100 cents by construction.
  assert.ok(Math.abs(centsBetween(440 * 2 ** (1 / 12), 440) - 100) < 1e-9);
});

test("centsFromNote signs flat as negative and sharp as positive", () => {
  const e2 = parseNote("E2");
  const target = noteToFrequency(e2);
  assert.ok(centsFromNote(target * 0.99, e2) < 0, "flat reads negative");
  assert.ok(centsFromNote(target * 1.01, e2) > 0, "sharp reads positive");
  // 10 cents sharp should read as 10 cents sharp.
  const tenSharp = target * 2 ** (10 / 1200);
  assert.ok(Math.abs(centsFromNote(tenSharp, e2) - 10) < 1e-9);
});

test("frequencyToNote finds the nearest note and the deviation", () => {
  const exact = frequencyToNote(440);
  assert.equal(formatNote(exact.note), "A4");
  assert.ok(Math.abs(exact.cents) < 1e-9);

  // 20 cents sharp of A4 is still A4.
  const sharp = frequencyToNote(440 * 2 ** (20 / 1200));
  assert.equal(formatNote(sharp.note), "A4");
  assert.ok(Math.abs(sharp.cents - 20) < 1e-9);

  // 60 cents sharp of A4 tips over into A#4, 40 cents flat.
  const over = frequencyToNote(440 * 2 ** (60 / 1200));
  assert.equal(formatNote(over.note), "A#4");
  assert.ok(Math.abs(over.cents + 40) < 1e-9);

  // Deviation never escapes half a semitone.
  for (let hz = 70; hz < 1400; hz *= 1.013) {
    assert.ok(Math.abs(frequencyToNote(hz).cents) <= 50 + 1e-9, `${hz} Hz`);
  }
});

test("frequencyToNote respects the spelling preference", () => {
  assert.equal(formatNote(frequencyToNote(466.16, 440, "sharp").note), "A#4");
  assert.equal(formatNote(frequencyToNote(466.16, 440, "flat").note), "Bb4");
});

test("non-positive frequencies are rejected rather than returning NaN", () => {
  assert.throws(() => frequencyToMidi(0), RangeError);
  assert.throws(() => frequencyToMidi(-440), RangeError);
  assert.throws(() => centsBetween(0, 440), RangeError);
});

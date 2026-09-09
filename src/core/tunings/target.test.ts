import test from "node:test";
import assert from "node:assert/strict";

import { formatNote, parseNote } from "../music/notes.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { findPreset } from "./presets.ts";
import { resolveShape } from "./resolve.ts";
import {
  IN_TUNE_CENTS,
  nearestString,
  searchRange,
  targetString,
  verdictFor,
} from "./target.ts";

const standard = resolveShape(findPreset("standard")!).strings;

test("an in-tune string identifies itself with no error", () => {
  standard.forEach((note, index) => {
    const found = nearestString(noteToFrequency(note), standard);
    assert.equal(found?.index, index);
    assert.ok(Math.abs(found!.cents) < 1e-9);
  });
});

test("a string being tuned up to pitch still reads as that string", () => {
  const a2 = standard[1];
  for (const offset of [-40, -15, 15, 40]) {
    const heard = noteToFrequency(a2) * 2 ** (offset / 1200);
    const found = nearestString(heard, standard);
    assert.equal(found?.index, 1, `${offset} cents off A2`);
    assert.ok(Math.abs(found!.cents - offset) < 1e-6);
  }
});

test("nearest is measured in cents, not Hz", () => {
  // 20 Hz above the low E is nearly four semitones; 20 Hz above the high E is
  // barely one. Measuring in Hz would treat those as equally close.
  const octaveApart = ["E2", "E4"].map(parseNote);
  const nearLow = nearestString(noteToFrequency(octaveApart[0]) + 20, octaveApart);
  assert.equal(formatNote(nearLow!.note), "E2");
  const nearHigh = nearestString(noteToFrequency(octaveApart[1]) + 20, octaveApart);
  assert.equal(formatNote(nearHigh!.note), "E4");
});

test("a chosen string is not abandoned when it drifts nearer another", () => {
  // The low E wound down a tone is closer to nothing else, but the D string
  // tuned down three semitones is nearer the A. Snapping mid-turn is the
  // behaviour that makes tuners infuriating.
  const heard = noteToFrequency(standard[2]) * 2 ** (-3 / 12);
  assert.equal(nearestString(heard, standard)?.index, 1, "drifted nearer the A");
  const held = targetString(heard, standard, 2);
  assert.equal(held?.index, 2);
  assert.ok(Math.abs(held!.cents + 300) < 1e-6);
});

test("targetString refuses indexes that do not exist", () => {
  assert.equal(targetString(110, standard, 9), null);
  assert.equal(targetString(110, standard, -1), null);
  assert.equal(targetString(0, standard, 0), null);
});

test("nothing sensible in, nothing out", () => {
  assert.equal(nearestString(0, standard), null);
  assert.equal(nearestString(-100, standard), null);
  assert.equal(nearestString(110, []), null);
});

test("the verdict has a tolerance rather than demanding perfection", () => {
  assert.equal(verdictFor(0), "in-tune");
  assert.equal(verdictFor(IN_TUNE_CENTS), "in-tune");
  assert.equal(verdictFor(-IN_TUNE_CENTS), "in-tune");
  assert.equal(verdictFor(IN_TUNE_CENTS + 0.1), "sharp");
  assert.equal(verdictFor(-IN_TUNE_CENTS - 0.1), "flat");
  assert.equal(verdictFor(1, 0.5), "sharp", "tolerance is adjustable");
});

test("the search range covers the tuning with room for a slack string", () => {
  const { minHz, maxHz } = searchRange(standard);
  const low = noteToFrequency(standard[0]);
  const high = noteToFrequency(standard[5]);
  assert.ok(minHz < low && minHz > low / 2, "a few semitones below the low string");
  assert.ok(maxHz > high && maxHz < high * 2);
  // A string four semitones flat is still inside the range.
  assert.ok(low * 2 ** (-4 / 12) >= minHz);
});

test("the search range follows the tuning and the reference pitch", () => {
  const dropB = resolveShape(findPreset("drop-b")!).strings;
  assert.ok(searchRange(dropB).minHz < searchRange(standard).minHz);
  assert.ok(searchRange(standard, 432).minHz < searchRange(standard, 440).minHz);
});

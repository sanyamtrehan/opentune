import test from "node:test";
import assert from "node:assert/strict";

import { formatNote, midiOf, parseNote } from "../music/notes.ts";
import { PRESETS, findPreset } from "./presets.ts";
import { resolveShape } from "./resolve.ts";
import {
  identifyTuning,
  newTuningId,
  shapeFromNotes,
  userTuning,
  validateStrings,
} from "./custom.ts";

const notes = (text: string) => text.split(" ").map(parseNote);

test("a user tuning resolves and is marked as theirs", () => {
  const tuning = userTuning(notes("D2 A2 D3 G3 A3 D4"), { id: "u1", name: "Mine" });
  assert.equal(tuning.userDefined, true);
  assert.equal(tuning.id, "u1");
  assert.equal(tuning.strings.map(formatNote).join(" "), "D2 A2 D3 G3 A3 D4");
});

test("user tunings are spelled by the same rule as presets", () => {
  const tuning = userTuning(notes("Eb2 Ab2 Db3 Gb3 Bb3 Eb4"), { id: "u", name: "n" });
  assert.equal(tuning.strings.map(formatNote).join(" "), "Eb2 Ab2 Db3 Gb3 Bb3 Eb4");
  // Given the same pitches spelled as sharps, it still writes them as flats.
  const same = userTuning(notes("D#2 G#2 C#3 F#3 A#3 D#4"), { id: "u", name: "n" });
  assert.deepEqual(same.strings, tuning.strings);
});

test("a user tuning becomes a shape, so it transposes like any other", () => {
  const shape = shapeFromNotes(notes("D2 A2 D3 G3 B3 E4"), {
    id: "u",
    name: "Mine",
  });
  const dropD = findPreset("drop-d")!;
  assert.deepEqual(shape.shape, dropD.shape);
  assert.equal(shape.rootOffset, dropD.rootOffset);
  assert.deepEqual(resolveShape(shape).strings, resolveShape(dropD).strings);
});

test("nonsense is rejected with something a person can read", () => {
  assert.equal(validateStrings(notes("E2 A2 D3 G3 B3")), "A guitar tuning needs six strings.");
  assert.match(validateStrings(notes("E2 A2 D3 G3 B3 E4 A4")) ?? "", /six strings/);
  assert.match(validateStrings(notes("E2 A2 D3 C3 B3 E4")) ?? "", /lowest to highest/);
  assert.match(validateStrings(notes("C0 A2 D3 G3 B3 E4")) ?? "", /outside what a guitar/);
  assert.match(validateStrings(notes("E2 A2 D3 G3 B3 C8")) ?? "", /outside what a guitar/);
  assert.equal(validateStrings(notes("E2 A2 D3 G3 B3 E4")), null);
  assert.throws(() => userTuning(notes("E2 A2"), { id: "u", name: "n" }), /six strings/);
});

test("unison strings are allowed — plenty of real tunings have them", () => {
  assert.equal(validateStrings(notes("D2 D3 D3 D3 D4 D4")), null);
});

test("a user tuning that is secretly a preset gets recognised", () => {
  const match = identifyTuning(notes("D2 A2 D3 G3 A3 D4"), PRESETS, resolveShape);
  assert.equal(match?.id, "dadgad");

  const spelledDifferently = identifyTuning(
    notes("Eb2 Ab2 C#3 Gb3 A#3 Eb4"),
    PRESETS,
    resolveShape,
  );
  assert.equal(spelledDifferently?.id, "eb-standard", "matching is by pitch, not spelling");

  assert.equal(identifyTuning(notes("C2 C3 D3 E3 F3 A4"), PRESETS, resolveShape), undefined);
});

test("every preset identifies as itself", () => {
  for (const preset of PRESETS) {
    const match = identifyTuning(resolveShape(preset).strings, PRESETS, resolveShape);
    assert.equal(match?.id, preset.id);
  }
});

test("ids never collide, even within one millisecond", () => {
  const now = Date.now();
  const ids = Array.from({ length: 1000 }, () => newTuningId(now));
  assert.equal(new Set(ids).size, ids.length);
  assert.match(ids[0], /^user-[0-9a-z]+-[0-9a-z]+$/);
});

test("shapeFromNotes always starts at zero", () => {
  const shape = shapeFromNotes(notes("C2 G2 C3 G3 C4 E4"), { id: "u", name: "n" });
  assert.equal(shape.shape[0], 0);
  assert.equal(shape.rootOffset, midiOf(parseNote("C2")) - midiOf(parseNote("E2")));
});

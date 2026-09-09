import test from "node:test";
import assert from "node:assert/strict";

import { formatNote } from "../music/notes.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { PATTERNS, pattern } from "./shapes.ts";
import { PRESETS, findPreset, findPresetByName } from "./presets.ts";
import {
  DEFAULT_FRET_COUNT,
  fretboardFor,
  resolveShape,
  transposeShape,
} from "./resolve.ts";

/** Resolve a preset by id and render it as `"E2 A2 D3 G3 B3 E4"`. */
function spell(id: string): string {
  const preset = findPreset(id);
  assert.ok(preset, `no preset ${id}`);
  return resolveShape(preset).strings.map(formatNote).join(" ");
}

test("the tunings everyone knows come out correct", () => {
  assert.equal(spell("standard"), "E2 A2 D3 G3 B3 E4");
  assert.equal(spell("drop-d"), "D2 A2 D3 G3 B3 E4");
  assert.equal(spell("dadgad"), "D2 A2 D3 G3 A3 D4");
  assert.equal(spell("open-g"), "D2 G2 D3 G3 B3 D4");
  assert.equal(spell("open-d"), "D2 A2 D3 F#3 A3 D4");
  assert.equal(spell("open-e"), "E2 B2 E3 G#3 B3 E4");
  assert.equal(spell("open-c"), "C2 G2 C3 G3 C4 E4");
  assert.equal(spell("open-a"), "E2 A2 E3 A3 C#4 E4");
  assert.equal(spell("all-fourths"), "E2 A2 D3 G3 C4 F4");
  assert.equal(spell("new-standard"), "C2 G2 D3 A3 E4 G4");
  assert.equal(spell("major-thirds"), "E2 G#2 C3 E3 G#3 C4");
  assert.equal(spell("double-drop-d"), "D2 A2 D3 G3 B3 D4");
  assert.equal(spell("open-d-minor"), "D2 A2 D3 F3 A3 D4");
  assert.equal(spell("open-g-minor"), "D2 G2 D3 G3 Bb3 D4");
});

test("downtuned families are the same shape moved", () => {
  assert.equal(spell("eb-standard"), "Eb2 Ab2 Db3 Gb3 Bb3 Eb4");
  assert.equal(spell("d-standard"), "D2 G2 C3 F3 A3 D4");
  assert.equal(spell("c-standard"), "C2 F2 Bb2 Eb3 G3 C4");
  assert.equal(spell("drop-c"), "C2 G2 C3 F3 A3 D4");
  assert.equal(spell("drop-b"), "B1 F#2 B2 E3 G#3 C#4");
});

test("C# standard is spelled with sharps, Eb standard with flats", () => {
  // The heuristic's whole job: Db standard would need Cb and Fb, so the
  // sharp spelling wins there; Eb standard needs neither, so flats win.
  assert.equal(spell("csharp-standard"), "C#2 F#2 B2 E3 G#3 C#4");
  assert.equal(spell("eb-standard"), "Eb2 Ab2 Db3 Gb3 Bb3 Eb4");
});

test("a caller can force a spelling", () => {
  const preset = findPreset("eb-standard");
  assert.ok(preset);
  const sharp = resolveShape(preset, { spelling: "sharp" });
  assert.equal(sharp.strings.map(formatNote).join(" "), "D#2 G#2 C#3 F#3 A#3 D#4");
});

test("standard tuning resolves to the published frequencies", () => {
  const expected = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
  const preset = findPreset("standard");
  assert.ok(preset);
  resolveShape(preset).strings.forEach((note, index) => {
    assert.ok(Math.abs(noteToFrequency(note) - expected[index]) < 0.01, formatNote(note));
  });
});

test("the reference pitch still applies to a resolved tuning", () => {
  const preset = findPreset("standard");
  assert.ok(preset);
  const low = resolveShape(preset).strings[0];
  assert.ok(Math.abs(noteToFrequency(low, 432) - 80.909) < 0.01);
});

test("Drop C is literally Drop D transposed", () => {
  const dropD = findPreset("drop-d");
  assert.ok(dropD);
  const derived = transposeShape(dropD, -2, { id: "drop-c", name: "Drop C" });
  assert.deepEqual(resolveShape(derived).strings, resolveShape(findPreset("drop-c")!).strings);
});

test("every preset is six strings, ascending, from a known pattern", () => {
  for (const preset of PRESETS) {
    assert.equal(preset.shape.length, 6, preset.id);
    assert.equal(preset.shape[0], 0, `${preset.id} must start at its root`);
    for (let i = 1; i < preset.shape.length; i += 1) {
      assert.ok(preset.shape[i] > preset.shape[i - 1], `${preset.id} must ascend`);
    }
    assert.ok(
      PATTERNS.some((p) => p.intervals.join() === preset.shape.join()),
      `${preset.id} is not built from a known pattern`,
    );
  }
});

test("preset ids and names are unique", () => {
  const ids = PRESETS.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = PRESETS.map((preset) => preset.name);
  assert.equal(new Set(names).size, names.length);
});

test("no two presets are secretly the same tuning", () => {
  const seen = new Map<string, string>();
  for (const preset of PRESETS) {
    const key = resolveShape(preset).strings.map(formatNote).join(" ");
    const clash = seen.get(key);
    assert.equal(clash, undefined, `${preset.id} duplicates ${clash}: ${key}`);
    seen.set(key, preset.id);
  }
});

test("patterns are distinct interval sets", () => {
  const seen = new Set(PATTERNS.map((p) => p.intervals.join()));
  assert.equal(seen.size, PATTERNS.length, "a pattern is a transposition of another");
  assert.throws(() => pattern("no-such-pattern"));
});

test("lookup by name accepts aliases and sloppy punctuation", () => {
  assert.equal(findPresetByName("Drop D")?.id, "drop-d");
  assert.equal(findPresetByName("drop-d")?.id, "drop-d");
  assert.equal(findPresetByName("DROP D")?.id, "drop-d");
  assert.equal(findPresetByName("Half Step Down")?.id, "eb-standard");
  assert.equal(findPresetByName("celtic")?.id, "dadgad");
  assert.equal(findPresetByName("NST")?.id, "new-standard");
  assert.equal(findPresetByName("nonsense"), undefined);
  assert.equal(findPreset("nonsense"), undefined);
});

test("a resolved tuning becomes a fretboard", () => {
  const tuning = resolveShape(findPreset("standard")!);
  const board = fretboardFor(tuning);
  assert.equal(board.fretCount, DEFAULT_FRET_COUNT);
  assert.deepEqual(board.strings, tuning.strings);
  assert.equal(fretboardFor(tuning, 24).fretCount, 24);
});

test("resolveShape can be renamed for a user-built tuning", () => {
  const tuning = resolveShape(findPreset("standard")!, { id: "mine", name: "Mine" });
  assert.equal(tuning.id, "mine");
  assert.equal(tuning.name, "Mine");
  assert.equal(tuning.userDefined, false, "resolveShape only builds presets");
});

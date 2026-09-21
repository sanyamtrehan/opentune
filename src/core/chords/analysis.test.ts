import test from "node:test";
import assert from "node:assert/strict";

import { buildChord, essentialTones, rootFromPitchClass } from "../music/chords.ts";
import { formatNote } from "../music/notes.ts";
import { findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import { analyseShape } from "./analysis.ts";
import { OPEN_SHAPES, findShape } from "./shapes.ts";

const standard = resolveShape(findPreset("standard")!).strings;

function analyse(rootPitchClass: number, quality: "major" | "minor") {
  const shape = findShape(rootPitchClass, quality)!;
  const chord = buildChord(rootFromPitchClass(rootPitchClass), quality);
  return { analysis: analyseShape(shape, chord, standard), chord };
}

test("names every string of the open C shape", () => {
  const { analysis } = analyse(0, "major");
  assert.deepEqual(
    analysis.strings.map((string) =>
      string.note === null ? "x" : `${formatNote(string.note)}(${string.degree})`,
    ),
    ["x", "C3(1)", "E3(3)", "G3(5)", "C4(1)", "E4(3)"],
  );
  assert.equal(analysis.strings[0].stringNumber, 6, "low string is the 6th");
  assert.equal(analysis.strings[5].stringNumber, 1);
});

test("counts what is doubled, which is the point", () => {
  // The answer a chord diagram never gives: C major open is not one of each.
  const { analysis } = analyse(0, "major");
  assert.deepEqual(
    analysis.degrees.map((entry) => `${entry.tone.degree}x${entry.count}`),
    ["1x2", "3x2", "5x1"],
  );

  // E major leans even harder on the root.
  const e = analyse(4, "major").analysis;
  assert.deepEqual(
    e.degrees.map((entry) => `${entry.tone.degree}x${entry.count}`),
    ["1x3", "3x1", "5x2"],
  );
});

test("minor is reported as a flattened third, with the right note", () => {
  const { analysis } = analyse(9, "minor");
  const third = analysis.degrees.find((entry) => entry.tone.degree === "♭3");
  assert.equal(formatNote(third!.tone.note), "C5");
  assert.ok(third!.count >= 1);
  assert.deepEqual(
    analysis.strings.map((string) => (string.note === null ? "x" : string.degree)),
    ["x", "1", "5", "1", "♭3", "5"],
  );
});

test("every open shape is complete and in root position", () => {
  // Nothing missing and nothing inverted, which is exactly why these are the
  // ones beginners learn. The one thing an open shape does drop is the fifth
  // of a seventh chord — the open C7 has no G in it — and that is a voicing
  // decision rather than an omission, so `essentialTones` allows for it.
  for (const shape of OPEN_SHAPES) {
    const chord = buildChord(rootFromPitchClass(shape.rootPitchClass), shape.quality);
    const analysis = analyseShape(shape, chord, standard);
    const essential = new Set(essentialTones(chord).map((tone) => tone.degree));
    assert.deepEqual(
      analysis.missing.filter((tone) => essential.has(tone.degree)),
      [],
      `${shape.id} is missing a chord tone`,
    );
    assert.equal(analysis.inverted, false, `${shape.id} is inverted`);
    assert.equal(analysis.bass.degree, "1");
    // Every sounding string belongs to the chord.
    for (const string of analysis.strings) {
      if (string.fret === "muted") continue;
      assert.ok(string.degree !== null, `${shape.id} sounds a non-chord tone`);
    }
  }
});

test("an inversion is detected and reported", () => {
  // Not one of the eight: C major with E in the bass, which is written C/E.
  const chord = buildChord(rootFromPitchClass(0), "major");
  const slash = {
    id: "c-over-e",
    name: "Test",
    rootPitchClass: 0,
    quality: "major" as const,
    frets: [0, 3, 2, 0, 1, 0],
    fingers: [null, 4, 2, null, 1, null] as (1 | 2 | 3 | 4 | null)[],
  };
  const analysis = analyseShape(slash, chord, standard);
  assert.equal(analysis.inverted, true);
  assert.equal(analysis.bass.degree, "3");
  assert.equal(formatNote(analysis.bass.note), "E2");
});

test("a missing chord tone is reported rather than glossed over", () => {
  // A power chord is not a triad: no third at all.
  const chord = buildChord(rootFromPitchClass(4), "major");
  const fifth = {
    id: "e5",
    name: "Test",
    rootPitchClass: 4,
    quality: "major" as const,
    frets: [0, 2, 2, "muted" as const, "muted" as const, "muted" as const],
    fingers: [null, 2, 3, null, null, null] as (1 | 2 | 3 | 4 | null)[],
  };
  const analysis = analyseShape(fifth, chord, standard);
  assert.deepEqual(analysis.missing.map((tone) => tone.degree), ["3"]);
  assert.equal(analysis.degrees.find((d) => d.tone.degree === "1")!.count, 2);
});

test("it works in a tuning that is not standard", () => {
  // The analysis takes the tuning as an argument, so it is already correct
  // for the day the shapes stop being standard-only.
  const dadgad = resolveShape(findPreset("dadgad")!).strings;
  const chord = buildChord(rootFromPitchClass(2), "major");
  const allOpen = {
    id: "dadgad-open",
    name: "Test",
    rootPitchClass: 2,
    quality: "major" as const,
    frets: [0, 0, 0, 0, 0, 0],
    fingers: [null, null, null, null, null, null] as (1 | 2 | 3 | 4 | null)[],
  };
  const analysis = analyseShape(allOpen, chord, dadgad);
  // D A D G A D against a D chord: the G is not a chord tone.
  assert.equal(analysis.strings[3].degree, null, "the G is outside D major");
  assert.deepEqual(analysis.missing.map((tone) => tone.degree), ["3"]);
  assert.equal(analysis.bass.degree, "1");
});

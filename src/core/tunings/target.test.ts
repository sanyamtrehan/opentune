import test from "node:test";
import assert from "node:assert/strict";

import { formatNote, midiOf, parseNote } from "../music/notes.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { PRESETS, findPreset } from "./presets.ts";
import { resolveShape } from "./resolve.ts";
import {
  AMBIGUOUS_CENTS,
  IN_TUNE_CENTS,
  isAmbiguous,
  nearestString,
  searchRange,
  semitonesOff,
  stringRange,
  targetString,
  trackString,
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

test("a sharp string is never mistaken for the next string up", () => {
  /*
   * The bug that broke a D string. Tuning up past D3, the nearest string
   * becomes G3 at about three semitones sharp, and a memoryless tuner then
   * says "flat — tighten" and points at 196 Hz. Following the string already
   * being tuned means it keeps saying "sharp" instead.
   */
  const d3 = noteToFrequency(standard[2]);
  for (const semitones of [1, 2, 2.5, 3, 3.5, 4, 4.5]) {
    const hz = d3 * 2 ** (semitones / 12);
    const tracked = trackString(hz, standard, 2);
    assert.equal(tracked?.index, 2, `${semitones} semitones sharp of D3`);
    assert.equal(
      verdictFor(tracked!.cents),
      "sharp",
      `${semitones} semitones sharp must read as sharp, never as flat`,
    );
  }
});

test("every string is safe from its neighbours, in every preset", () => {
  // Not just the D: the same trap sits between every adjacent pair, and the
  // gap varies — Major Thirds puts its strings only four semitones apart.
  // A memoryless tuner flips at half the gap, so that is what is swept.
  for (const preset of PRESETS) {
    const strings = resolveShape(preset).strings;
    strings.forEach((note, index) => {
      const next = strings[index + 1];
      if (!next) return;
      const gap = midiOf(next) - midiOf(note);
      if (gap === 0) return; // Unison strings are genuinely indistinguishable.
      const base = noteToFrequency(note);
      for (let semitones = 0.5; semitones <= gap * 0.75; semitones += 0.5) {
        const tracked = trackString(base * 2 ** (semitones / 12), strings, index);
        assert.notEqual(
          verdictFor(tracked!.cents),
          "flat",
          `${preset.id} string ${index} sharp by ${semitones} told to tighten`,
        );
      }
    });
  }
});

test("a slack string is still told to tighten, towards its own note", () => {
  // The safeguard must not break the ordinary case of bringing a loose
  // string up to pitch.
  const d3 = noteToFrequency(standard[2]);
  for (const semitones of [1, 2, 3, 4]) {
    const tracked = trackString(d3 * 2 ** (-semitones / 12), standard, 2);
    assert.equal(tracked?.index, 2);
    assert.equal(verdictFor(tracked!.cents), "flat", "should say tighten");
  }
});

test("it does follow you when you genuinely change string", () => {
  // Stickiness must not mean stubbornness: playing another string plainly
  // should move the target.
  standard.forEach((note, index) => {
    const tracked = trackString(noteToFrequency(note), standard, 2);
    assert.equal(tracked?.index, index, `playing ${formatNote(note)} in tune`);
  });
});

test("with no previous string it simply picks the nearest", () => {
  const a2 = noteToFrequency(standard[1]);
  assert.equal(trackString(a2, standard, null)?.index, 1);
  assert.deepEqual(trackString(a2, standard, null), nearestString(a2, standard));
  assert.equal(trackString(0, standard, 2), null);
});

test("a previous string that no longer exists is ignored", () => {
  // Switching to a tuning with the same string count keeps indexes valid,
  // but a stale index from somewhere else must not crash or stick.
  const a2 = noteToFrequency(standard[1]);
  assert.equal(trackString(a2, standard, 99)?.index, 1);
});

test("far-off readings are flagged rather than stated confidently", () => {
  assert.equal(isAmbiguous(0), false);
  assert.equal(isAmbiguous(-100), false);
  assert.equal(isAmbiguous(AMBIGUOUS_CENTS), false);
  assert.equal(isAmbiguous(AMBIGUOUS_CENTS + 1), true);
  assert.equal(isAmbiguous(-300), true);
  assert.equal(semitonesOff(300), 3);
  assert.equal(semitonesOff(-50), -0.5);
});

test("a single string's range is tight enough to shorten the window", () => {
  const whole = searchRange(standard);
  const high = stringRange(standard, 5)!;
  const low = stringRange(standard, 0)!;

  // Each string's range sits inside the tuning's range...
  assert.ok(high.minHz > whole.minHz && high.maxHz <= whole.maxHz + 1e-9);
  assert.ok(low.minHz >= whole.minHz - 1e-9);

  // ...and the high string's floor is far above the tuning's, which is the
  // whole point: the window length follows the lowest pitch searched for.
  assert.ok(high.minHz > whole.minHz * 3, `${high.minHz} vs ${whole.minHz}`);

  // Four semitones of slack either way, so a badly out string is still seen.
  const e4 = noteToFrequency(standard[5]);
  assert.ok(Math.abs(1200 * Math.log2(high.minHz / e4) + 400) < 1);
  assert.ok(Math.abs(1200 * Math.log2(high.maxHz / e4) - 400) < 1);

  assert.equal(stringRange(standard, 9), null);
  assert.ok(stringRange(standard, 0, 432)!.minHz < low.minHz);
});

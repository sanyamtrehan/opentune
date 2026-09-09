import test from "node:test";
import assert from "node:assert/strict";

import { detectPitch, windowSizeFor } from "./detect-pitch.ts";
import {
  MISSING_FUNDAMENTAL,
  PLUCKED,
  WEAK_FUNDAMENTAL,
  harmonicTone,
  whiteNoise,
} from "./test-signals.ts";
import { pluck } from "./karplus-strong.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { parseNote } from "../music/notes.ts";
import { PRESETS } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";

const cents = (hz: number, target: number) => 1200 * Math.log2(hz / target);

/** Standard tuning, as the frequencies the detector will actually see. */
const STANDARD = ["E2", "A2", "D3", "G3", "B3", "E4"].map((text) =>
  noteToFrequency(parseNote(text)),
);

/** Frame sized for the string being listened to, as mic mode will do. */
function frameFor(target: number, sampleRate: number, harmonics?: number[]) {
  const size = windowSizeFor(target, sampleRate);
  return harmonicTone({
    frequency: target,
    sampleRate,
    duration: size / sampleRate,
    harmonics,
  }).subarray(0, size);
}

test("hits every open string inside a cent", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const target of STANDARD) {
      const reading = detectPitch(frameFor(target, sampleRate), sampleRate);
      const error = cents(reading.hz, target);
      assert.ok(
        Math.abs(error) < 1,
        `${target.toFixed(2)} Hz @ ${sampleRate}: off by ${error.toFixed(3)} cents`,
      );
      assert.ok(reading.clarity > 0.9, `clarity ${reading.clarity.toFixed(3)}`);
    }
  }
});

test("stays inside a cent when the string is out of tune", () => {
  // A tuner that is only accurate on in-tune notes is not a tuner.
  const sampleRate = 48000;
  for (const target of STANDARD) {
    for (const offset of [-49, -30, -7, 7, 30, 49]) {
      const detuned = target * 2 ** (offset / 1200);
      const reading = detectPitch(frameFor(detuned, sampleRate), sampleRate);
      const error = cents(reading.hz, detuned);
      assert.ok(
        Math.abs(error) < 1,
        `${detuned.toFixed(2)} Hz: off by ${error.toFixed(3)} cents`,
      );
    }
  }
});

test("no octave errors when the fundamental is weaker than its harmonics", () => {
  const sampleRate = 48000;
  for (const harmonics of [WEAK_FUNDAMENTAL, MISSING_FUNDAMENTAL]) {
    for (const target of STANDARD) {
      const reading = detectPitch(
        frameFor(target, sampleRate, harmonics),
        sampleRate,
      );
      const error = cents(reading.hz, target);
      assert.ok(
        Math.abs(error) < 20,
        `${target.toFixed(2)} Hz: reported ${reading.hz.toFixed(2)} Hz` +
          ` (${(error / 100).toFixed(2)} semitones out)`,
      );
      assert.ok(Math.abs(error) < 1, `off by ${error.toFixed(3)} cents`);
    }
  }
});

test("survives noise, decay and inharmonicity together", () => {
  const sampleRate = 48000;
  for (const target of STANDARD) {
    const size = windowSizeFor(target, sampleRate);
    const frame = harmonicTone({
      frequency: target,
      sampleRate,
      duration: size / sampleRate,
      harmonics: WEAK_FUNDAMENTAL,
      noise: 0.05,
      decay: 2,
      inharmonicity: 5e-5,
      seed: 99,
    }).subarray(0, size);
    const reading = detectPitch(frame, sampleRate);
    const error = cents(reading.hz, target);
    // Looser than the clean case on purpose: a stiff string genuinely has no
    // single exact pitch, so demanding a cent here would be demanding the
    // detector agree with a number that is itself an approximation.
    assert.ok(
      Math.abs(error) < 3,
      `${target.toFixed(2)} Hz: off by ${error.toFixed(2)} cents`,
    );
  }
});

test("tracks the whole range a fretted guitar produces", () => {
  const sampleRate = 48000;
  // Low B on a downtuned 6-string up to the 22nd fret of the high E.
  for (let hz = 61.7; hz < 1200; hz *= 2 ** (1 / 12)) {
    const reading = detectPitch(frameFor(hz, sampleRate), sampleRate);
    const error = cents(reading.hz, hz);
    assert.ok(Math.abs(error) < 1, `${hz.toFixed(2)} Hz: ${error.toFixed(3)} cents`);
  }
});

test("every string of every preset is detectable", () => {
  const sampleRate = 48000;
  for (const preset of PRESETS) {
    for (const note of resolveShape(preset).strings) {
      const target = noteToFrequency(note);
      const reading = detectPitch(
        frameFor(target, sampleRate, WEAK_FUNDAMENTAL),
        sampleRate,
      );
      const error = cents(reading.hz, target);
      assert.ok(
        Math.abs(error) < 2,
        `${preset.id} ${target.toFixed(2)} Hz: off by ${error.toFixed(2)} cents`,
      );
    }
  }
});

test("reads the project's own synthesised string correctly", () => {
  // An end-to-end check: what ear mode plays is what mic mode should hear.
  const sampleRate = 48000;
  for (const text of ["E2", "A2", "D3", "G3", "B3", "E4"]) {
    const target = noteToFrequency(parseNote(text));
    const rendered = pluck({ frequency: target, sampleRate, duration: 1 });
    const size = windowSizeFor(target, sampleRate);
    const start = Math.floor(sampleRate * 0.15);
    const reading = detectPitch(rendered.subarray(start, start + size), sampleRate);
    const error = cents(reading.hz, target);
    assert.ok(Math.abs(error) < 2, `${text}: off by ${error.toFixed(2)} cents`);
  }
});

test("refuses to report a pitch for things that have none", () => {
  const sampleRate = 48000;

  const silence = detectPitch(new Float32Array(4096), sampleRate);
  assert.equal(silence.hz, 0);
  assert.equal(silence.clarity, 0);

  const dc = new Float32Array(4096).fill(0.5);
  assert.equal(detectPitch(dc, sampleRate).hz, 0, "a DC offset is not a pitch");

  const noise = detectPitch(whiteNoise(4096), sampleRate);
  assert.ok(
    noise.clarity < 0.9,
    `noise should not look clear, got ${noise.clarity.toFixed(3)}`,
  );

  assert.equal(detectPitch(new Float32Array(2), sampleRate).hz, 0);
  assert.equal(detectPitch(new Float32Array(4096), 0).hz, 0);
});

test("never reports a pitch outside the range it was asked for", () => {
  // The range is a search constraint, not a validity filter: told to look
  // between 300 and 1400 Hz, the detector may legitimately lock onto a
  // partial of a 220 Hz tone. What it must never do is answer outside the
  // range it was given, because mic mode narrows the range to the string it
  // is listening for.
  const sampleRate = 48000;
  const frame = frameFor(220, sampleRate);
  for (const range of [
    { minHz: 300, maxHz: 1400 },
    { minHz: 55, maxHz: 100 },
    { minHz: 200, maxHz: 240 },
  ]) {
    const { hz } = detectPitch(frame, sampleRate, range);
    assert.ok(
      hz === 0 || (hz >= range.minHz && hz <= range.maxHz),
      `${hz} escaped ${range.minHz}-${range.maxHz}`,
    );
  }
  // Narrowed to the right string, it still finds it exactly.
  const focused = detectPitch(frame, sampleRate, { minHz: 200, maxHz: 240 });
  assert.ok(Math.abs(cents(focused.hz, 220)) < 1, `${focused.hz}`);
});

test("clarity separates a plucked string from a room", () => {
  const sampleRate = 48000;
  const clean = detectPitch(frameFor(110, sampleRate, PLUCKED), sampleRate);

  const size = windowSizeFor(110, sampleRate);
  const noisy = harmonicTone({
    frequency: 110,
    sampleRate,
    duration: size / sampleRate,
    noise: 3,
    seed: 5,
  }).subarray(0, size);

  assert.ok(clean.clarity > 0.95, `clean: ${clean.clarity.toFixed(3)}`);
  assert.ok(
    detectPitch(noisy, sampleRate).clarity < clean.clarity,
    "buried in noise must read as less clear than clean",
  );
});

test("windowSizeFor gives the low strings the longer window they need", () => {
  const sampleRate = 48000;
  const low = windowSizeFor(82.41, sampleRate);
  const high = windowSizeFor(329.63, sampleRate);
  assert.ok(low > high * 3.5, `${low} should be about four times ${high}`);
  // Three periods, doubled for the correlation overlap.
  assert.ok(low >= (3 * sampleRate) / 82.41);
});

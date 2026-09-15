import test from "node:test";
import assert from "node:assert/strict";

import { decimate, decimationFor } from "./decimate.ts";
import { analysePitch, detectPitch, windowSizeFor } from "./detect-pitch.ts";
import { WEAK_FUNDAMENTAL, harmonicTone } from "./test-signals.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { formatNote } from "../music/notes.ts";
import { PRESETS } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import { searchRange } from "../tunings/target.ts";

const cents = (hz: number, target: number) => 1200 * Math.log2(hz / target);

test("decimation is chosen from period resolution, not from speed", () => {
  // A guitar's highest fundamental is around 420 Hz, so 48 kHz allows four.
  assert.equal(decimationFor(48000, 415), 4);
  assert.equal(decimationFor(44100, 415), 4);
  // A narrower range allows more; a wider one allows less.
  assert.equal(decimationFor(48000, 120), 8);
  assert.ok(decimationFor(48000, 1400) < 4, "the full range cannot decimate far");
  // Nonsense in, no decimation out.
  assert.equal(decimationFor(0, 415), 1);
  assert.equal(decimationFor(48000, 0), 1);
});

test("decimate reduces the rate and keeps the waveform's pitch", () => {
  const sampleRate = 48000;
  const frame = harmonicTone({ frequency: 220, sampleRate, duration: 0.2 });
  const reduced = decimate(frame, 4);
  assert.ok(reduced.length < frame.length / 3.5);
  const reading = detectPitch(reduced, sampleRate / 4, { minHz: 80, maxHz: 500 });
  assert.ok(Math.abs(cents(reading.hz, 220)) < 1, `${reading.hz}`);
});

test("decimate refuses factors it cannot honour", () => {
  const frame = harmonicTone({ frequency: 220, sampleRate: 48000, duration: 0.1 });
  assert.equal(decimate(frame, 1), frame, "a factor of one is a no-op");
  assert.equal(decimate(frame, 2.5), frame, "fractional factors are refused");
  // Too short to filter: returned untouched rather than truncated to noise.
  assert.equal(decimate(new Float32Array(8), 4).length, 8);
});

test("analysePitch keeps accuracy inside a cent across every preset", () => {
  const sampleRate = 48000;
  for (const preset of PRESETS) {
    const strings = resolveShape(preset).strings;
    const { minHz, maxHz } = searchRange(strings);
    const size = windowSizeFor(minHz, sampleRate);
    for (const note of strings) {
      const target = noteToFrequency(note);
      // Off pitch as well as on: a tuner is used while the string is wrong.
      for (const offset of [-40, -12, 0, 12, 40]) {
        const hz = target * 2 ** (offset / 1200);
        const frame = harmonicTone({
          frequency: hz,
          sampleRate,
          duration: size / sampleRate,
          harmonics: WEAK_FUNDAMENTAL,
          noise: 0.03,
          decay: 2.5,
          inharmonicity: 3e-5,
          seed: 11,
        }).subarray(0, size);
        const reading = analysePitch(frame, sampleRate, { minHz, maxHz });
        const error = cents(reading.hz, hz);
        assert.ok(
          Math.abs(error) < 1,
          `${preset.id} ${formatNote(note)} ${offset}c: off by ${error.toFixed(2)}`,
        );
        assert.ok(reading.clarity > 0.9, `${preset.id} ${formatNote(note)} clarity`);
      }
    }
  }
});

test("analysePitch fits inside one audio render quantum", () => {
  /*
   * The reason decimation exists. The undecimated detector measured 3.2ms
   * against a 2.67ms quantum, which stalls the audio thread and stops
   * readings arriving at all.
   *
   * The budget here is generous because CI machines are not fast, and the
   * point is the order of magnitude, not a precise number.
   */
  const sampleRate = 48000;
  const quantumMs = (128 / sampleRate) * 1000;
  const { minHz, maxHz } = searchRange(
    resolveShape(PRESETS[0]).strings,
  );
  const size = windowSizeFor(minHz, sampleRate);
  const frame = harmonicTone({
    frequency: 82.41,
    sampleRate,
    duration: size / sampleRate,
    harmonics: WEAK_FUNDAMENTAL,
    noise: 0.02,
  }).subarray(0, size);

  for (let i = 0; i < 20; i += 1) analysePitch(frame, sampleRate, { minHz, maxHz });
  const started = performance.now();
  const runs = 50;
  for (let i = 0; i < runs; i += 1) analysePitch(frame, sampleRate, { minHz, maxHz });
  const each = (performance.now() - started) / runs;

  assert.ok(
    each < quantumMs,
    `analysePitch took ${each.toFixed(2)}ms, over the ${quantumMs.toFixed(2)}ms quantum`,
  );
});

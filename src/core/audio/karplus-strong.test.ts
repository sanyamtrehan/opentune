import test from "node:test";
import assert from "node:assert/strict";

import { pluck } from "./karplus-strong.ts";
import { noteToFrequency } from "../music/frequency.ts";
import { parseNote } from "../music/notes.ts";
import { PRESETS, findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";

/**
 * Estimate the pitch of a rendered buffer by autocorrelation, with parabolic
 * interpolation on the peak. Deliberately independent of anything in `src` —
 * a synth verified with its own maths verifies nothing.
 */
function measureHz(samples: Float32Array, sampleRate: number, expected: number): number {
  const period = sampleRate / expected;
  const window = Math.min(Math.floor(period * 8), samples.length >> 1);
  const offset = Math.min(Math.floor(sampleRate * 0.1), samples.length - window * 2);
  const frame = samples.subarray(offset, offset + window * 2);

  const minLag = Math.max(2, Math.floor(period * 0.6));
  const maxLag = Math.min(Math.ceil(period * 1.6), window);

  const correlate = (lag: number) => {
    let sum = 0;
    for (let i = 0; i < window; i += 1) sum += frame[i] * frame[i + lag];
    return sum;
  };

  let bestLag = minLag;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const value = correlate(lag);
    if (value > best) {
      best = value;
      bestLag = lag;
    }
  }

  const before = correlate(bestLag - 1);
  const after = correlate(bestLag + 1);
  const denominator = 2 * (2 * best - before - after);
  const shift = denominator === 0 ? 0 : (after - before) / denominator;
  return sampleRate / (bestLag + shift);
}

const cents = (hz: number, target: number) => 1200 * Math.log2(hz / target);

test("renders the requested pitch within a cent across the guitar's range", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const text of ["E2", "A2", "D3", "G3", "B3", "E4", "C5"]) {
      const target = noteToFrequency(parseNote(text));
      const samples = pluck({ frequency: target, sampleRate, duration: 1 });
      const error = cents(measureHz(samples, sampleRate, target), target);
      assert.ok(
        Math.abs(error) < 1,
        `${text} @ ${sampleRate}: off by ${error.toFixed(2)} cents`,
      );
    }
  }
});

test("hits non-440 reference pitches just as exactly", () => {
  const sampleRate = 48000;
  for (const reference of [432, 442, 415]) {
    const target = noteToFrequency(parseNote("A2"), reference);
    const samples = pluck({ frequency: target, sampleRate, duration: 1 });
    const error = cents(measureHz(samples, sampleRate, target), target);
    assert.ok(Math.abs(error) < 1, `A4=${reference}: off by ${error.toFixed(2)} cents`);
  }
});

test("every string of every preset is renderable and in tune", () => {
  const sampleRate = 48000;
  for (const preset of PRESETS) {
    for (const note of resolveShape(preset).strings) {
      const target = noteToFrequency(note);
      const samples = pluck({ frequency: target, sampleRate, duration: 0.6 });
      const error = cents(measureHz(samples, sampleRate, target), target);
      assert.ok(Math.abs(error) < 2, `${preset.id}: off by ${error.toFixed(2)} cents`);
    }
  }
});

test("the tone is harmonically rich, which is the point of not using a sine", () => {
  const sampleRate = 48000;
  const target = noteToFrequency(parseNote("E2"));
  const samples = pluck({ frequency: target, sampleRate, duration: 1 });

  // Correlate against sine and cosine at each harmonic to get its strength.
  const strength = (hz: number) => {
    let real = 0;
    let imaginary = 0;
    const start = Math.floor(sampleRate * 0.05);
    const count = Math.floor(sampleRate * 0.2);
    for (let i = 0; i < count; i += 1) {
      const phase = (2 * Math.PI * hz * i) / sampleRate;
      real += samples[start + i] * Math.cos(phase);
      imaginary += samples[start + i] * Math.sin(phase);
    }
    return Math.hypot(real, imaginary) / count;
  };

  const fundamental = strength(target);
  const harmonics = [2, 3, 4].map((n) => strength(target * n));
  assert.ok(fundamental > 0, "there is a fundamental");
  assert.ok(
    harmonics.some((value) => value > fundamental * 0.05),
    `harmonics are too weak: ${harmonics.map((v) => (v / fundamental).toFixed(3)).join(", ")}`,
  );
});

test("it decays, and ends silent enough not to click", () => {
  const sampleRate = 48000;
  const samples = pluck({
    frequency: noteToFrequency(parseNote("A2")),
    sampleRate,
    duration: 2,
    sustain: 1,
  });

  const rms = (from: number, to: number) => {
    let sum = 0;
    for (let i = from; i < to; i += 1) sum += samples[i] * samples[i];
    return Math.sqrt(sum / (to - from));
  };

  const early = rms(0, sampleRate * 0.1);
  const late = rms(sampleRate * 1.5, sampleRate * 1.6);
  assert.ok(late < early * 0.1, `decay too slow: ${early} -> ${late}`);
  assert.ok(Math.abs(samples[samples.length - 1]) < 1e-6, "tail must fade to zero");
});

test("output stays finite and inside the requested gain", () => {
  const samples = pluck({
    frequency: noteToFrequency(parseNote("E2")),
    sampleRate: 48000,
    duration: 1,
    gain: 0.5,
  });
  assert.equal(samples.length, 48000);
  for (const sample of samples) {
    assert.ok(Number.isFinite(sample), "no NaN or Infinity");
    assert.ok(Math.abs(sample) <= 0.5 + 1e-6, `clipped at ${sample}`);
  }
});

test("the same seed renders the same buffer", () => {
  const options = { frequency: 220, sampleRate: 48000, duration: 0.2 };
  assert.deepEqual(pluck(options), pluck(options));
  assert.notDeepEqual(pluck(options), pluck({ ...options, seed: 99 }));
});

test("impossible requests are rejected rather than rendered as noise", () => {
  const sampleRate = 48000;
  assert.throws(() => pluck({ frequency: 0, sampleRate, duration: 1 }), RangeError);
  assert.throws(() => pluck({ frequency: -100, sampleRate, duration: 1 }), RangeError);
  assert.throws(() => pluck({ frequency: 30000, sampleRate, duration: 1 }), RangeError);
  assert.throws(() => pluck({ frequency: 220, sampleRate: 0, duration: 1 }), RangeError);
});

test("a real string from a real preset is what this exists to play", () => {
  const openG = resolveShape(findPreset("open-g")!);
  const samples = pluck({
    frequency: noteToFrequency(openG.strings[0]),
    sampleRate: 48000,
    duration: 0.5,
  });
  assert.ok(samples.some((sample) => sample !== 0));
});

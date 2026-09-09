/**
 * Pitch detection: McLeod Pitch Method (MPM).
 *
 * Pure by design — a Float32Array and a sample rate in, a reading out. No
 * AudioContext, no AudioWorklet, no browser. The worklet is a thin shell
 * around this, which is what makes the detector testable in Node against
 * ground truth instead of against somebody's ears. See AGENTS.md.
 *
 * Why not FFT peak-picking: on a guitar the fundamental is routinely weaker
 * than the 2nd or 3rd harmonic, especially on the wound strings, so the
 * loudest bin is often an octave or a twelfth above the note being played.
 * MPM works in the time domain and picks the *first* qualifying peak rather
 * than the largest, which is precisely the property that avoids that error.
 */

import type { PitchReading } from "../music/types.ts";

export interface DetectOptions {
  /** Lowest pitch worth looking for. Drop A on a 6-string is about 55 Hz. */
  minHz?: number;
  /** Highest pitch worth looking for. Well above a 22nd-fret high E. */
  maxHz?: number;
  /**
   * How close a peak must come to the strongest one to be preferred over it.
   * Lower values favour the lower octave more aggressively. 0.9 is McLeod's
   * suggestion and holds up well on guitar.
   */
  peakThreshold?: number;
}

const DEFAULTS = {
  minHz: 55,
  maxHz: 1400,
  peakThreshold: 0.9,
};

/** Nothing usable in this frame. */
const SILENT: PitchReading = { hz: 0, clarity: 0 };

/**
 * How long a frame needs to be to detect a given pitch.
 *
 * Reliable detection needs two to three periods in the window, so the answer
 * depends on the string: low E at ~82 Hz needs roughly three times the window
 * that high E does. A single fixed size is either sluggish on the top strings
 * or unreliable on the bottom ones, so callers are expected to size their
 * frame for the string they are listening for.
 */
export function windowSizeFor(
  hz: number,
  sampleRate: number,
  periods: number = 3,
): number {
  // Doubled because the correlation needs a full lag's worth of overlap on
  // top of the periods being measured.
  return Math.ceil((periods * sampleRate) / hz) * 2;
}

/**
 * Estimate the pitch of one frame.
 *
 * `clarity` is 0-1 and says how periodic the frame actually was. It is not a
 * confidence score in a statistical sense, but it separates a plucked string
 * from a room, a cough or a chord, and callers should refuse to display a
 * reading below roughly 0.9.
 */
export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options: DetectOptions = {},
): PitchReading {
  const minHz = options.minHz ?? DEFAULTS.minHz;
  const maxHz = options.maxHz ?? DEFAULTS.maxHz;
  const peakThreshold = options.peakThreshold ?? DEFAULTS.peakThreshold;

  const size = frame.length;
  if (size < 4 || !(sampleRate > 0)) return SILENT;

  // The longest lag we can measure is half the frame; beyond that there is
  // too little overlap left for the correlation to mean anything.
  const maxLag = Math.min(size >> 1, Math.floor(sampleRate / minHz));
  const minLag = Math.max(2, Math.ceil(sampleRate / maxHz));
  if (minLag >= maxLag) return SILENT;

  // Remove DC before correlating. A constant offset — which cheap mics and
  // some interfaces have plenty of — correlates perfectly with itself at
  // every lag and flattens the whole function towards 1.
  let mean = 0;
  for (let i = 0; i < size; i += 1) mean += frame[i];
  mean /= size;

  const signal = new Float32Array(size);
  let energy = 0;
  for (let i = 0; i < size; i += 1) {
    const value = frame[i] - mean;
    signal[i] = value;
    energy += value * value;
  }
  // Guard against silence: the NSDF is 0/0 there and would produce noise.
  if (energy < 1e-12) return SILENT;

  /*
   * Normalised square difference function.
   *
   * nsdf[lag] = 2 * r[lag] / m[lag], where r is the autocorrelation at that
   * lag and m is the summed energy of the two overlapping halves. Dividing by
   * m is what stops the function decaying as the overlap shrinks, which is
   * the flaw that makes plain autocorrelation biased towards short lags —
   * and therefore towards reporting harmonics instead of the fundamental.
   */
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let overlap = 0;
    for (let i = 0; i < size - lag; i += 1) {
      const a = signal[i];
      const b = signal[i + lag];
      correlation += a * b;
      overlap += a * a + b * b;
    }
    nsdf[lag] = overlap > 0 ? (2 * correlation) / overlap : 0;
  }

  /*
   * Key maxima: the highest point of each positive lobe of the NSDF.
   *
   * The first lobe around lag 0 is skipped — it is the signal correlating
   * with itself and always peaks at 1.
   */
  let lag = 0;
  while (lag < maxLag && nsdf[lag] > 0) lag += 1;
  while (lag < maxLag && nsdf[lag] <= 0) lag += 1;

  let bestValue = -1;
  const peaks: number[] = [];
  while (lag < maxLag) {
    if (nsdf[lag] > 0) {
      let peak = lag;
      while (lag < maxLag && nsdf[lag] > 0) {
        if (nsdf[lag] > nsdf[peak]) peak = lag;
        lag += 1;
      }
      if (peak >= minLag) {
        peaks.push(peak);
        if (nsdf[peak] > bestValue) bestValue = nsdf[peak];
      }
    }
    lag += 1;
  }

  if (peaks.length === 0 || bestValue <= 0) return SILENT;

  /*
   * Take the *first* peak that comes within `peakThreshold` of the best one,
   * not the best one itself. On a string whose second harmonic is louder than
   * its fundamental, the tallest peak sits at half the true period; the
   * fundamental's peak is earlier and nearly as tall. Preferring the earlier
   * peak is the whole octave-error defence.
   */
  const threshold = peakThreshold * bestValue;
  const chosen = peaks.find((peak) => nsdf[peak] >= threshold) ?? peaks[0];

  /*
   * Parabolic interpolation through the three samples around the peak.
   *
   * Required, not a refinement: the raw lag is an integer, and at 330 Hz on a
   * 48 kHz stream one sample of lag is about 6 cents. Without this the
   * detector could not resolve the ±1 cent it is aiming for.
   */
  const previous = nsdf[chosen - 1] ?? nsdf[chosen];
  const next = nsdf[chosen + 1] ?? nsdf[chosen];
  const denominator = 2 * (2 * nsdf[chosen] - previous - next);
  const shift = denominator === 0 ? 0 : (next - previous) / denominator;
  const period = chosen + Math.max(-1, Math.min(1, shift));
  if (period <= 0) return SILENT;

  // The interpolated peak height is a better clarity estimate than the
  // sampled one, for the same reason the interpolated lag is better.
  const clarity = Math.max(
    0,
    Math.min(1, nsdf[chosen] - 0.25 * (previous - next) * shift),
  );

  const hz = sampleRate / period;
  if (hz < minHz || hz > maxHz) return SILENT;

  return { hz, clarity };
}

/**
 * Downsampling, so pitch detection is affordable on the audio thread.
 *
 * The NSDF in `detectPitch` costs O(window x maxLag). At 48 kHz, finding an
 * 82 Hz fundamental needs a 92 ms window and lags out to 733 samples — about
 * 3.2 million inner iterations per reading, which measured at 3.2 ms against
 * an audio render quantum of 2.67 ms. Over budget on a desktop, hopeless on a
 * phone: the audio thread stalls and readings stop arriving altogether.
 *
 * A guitar's fundamental never exceeds ~420 Hz, so 48 kHz is oversampled by
 * more than fifty times for this purpose. Dropping the rate by a factor of N
 * cuts both the window and the lag range, so the cost falls by N squared.
 *
 * Pure: samples in, samples out. Tested in Node like everything else here.
 */

/** Filter half-width per unit of decimation. Higher is sharper and slower. */
const TAPS_PER_FACTOR = 8;

const filterCache = new Map<number, Float32Array>();

/**
 * Windowed-sinc low-pass, designed for the new Nyquist limit.
 *
 * Decimating without filtering first folds every harmonic above the new
 * Nyquist back down into the range we are measuring, and a guitar has plenty
 * of energy up there. Aliased partials look exactly like real periodicity,
 * which is the one thing a pitch detector must not be fed.
 */
function lowPassFor(factor: number): Float32Array {
  const cached = filterCache.get(factor);
  if (cached) return cached;

  // Slightly below the new Nyquist, to leave the transition band somewhere
  // to go.
  const cutoff = 0.45 / factor;
  const half = TAPS_PER_FACTOR * factor;
  const taps = new Float32Array(half * 2 + 1);

  let sum = 0;
  for (let i = 0; i < taps.length; i += 1) {
    const x = i - half;
    const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
    // Hamming window: enough stopband rejection for this, and cheap.
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (taps.length - 1));
    taps[i] = sinc * window;
    sum += taps[i];
  }
  // Normalise to unity gain so clarity and level are unchanged.
  for (let i = 0; i < taps.length; i += 1) taps[i] /= sum;

  filterCache.set(factor, taps);
  return taps;
}

/** Low-pass and keep every `factor`-th sample. */
export function decimate(frame: Float32Array, factor: number): Float32Array {
  if (factor <= 1 || !Number.isInteger(factor)) return frame;

  const taps = lowPassFor(factor);
  const length = Math.floor((frame.length - taps.length) / factor) + 1;
  if (length < 4) return frame;

  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = i * factor;
    let value = 0;
    for (let k = 0; k < taps.length; k += 1) value += taps[k] * frame[start + k];
    output[i] = value;
  }
  return output;
}

/**
 * Samples per period required at the highest pitch being searched for.
 *
 * This, not filter headroom, is what limits decimation. The lag axis is
 * integers, and parabolic interpolation only recovers sub-sample precision
 * while the period spans enough samples to have a shape. Measured on
 * detuned, harmonic-rich signals across the guitar's range:
 *
 *   48 kHz / 1  =  48000 Hz   0.42 cents   3.18 ms   (over the audio budget)
 *   48 kHz / 2  =  24000 Hz   0.42 cents   0.90 ms
 *   48 kHz / 4  =  12000 Hz   0.66 cents   0.30 ms
 *   48 kHz / 8  =   6000 Hz   OCTAVE ERROR 0.15 ms
 *
 * At 6 kHz a high E spans 18 samples and the detector starts picking the
 * wrong peak entirely — a full 1200 cents out, not a rounding error. 24 keeps
 * a factor of 4 at 48 kHz, which measured under a cent.
 */
const MIN_SAMPLES_PER_PERIOD = 24;

/** Hard ceiling, so an odd sample rate cannot decimate into nonsense. */
const MAX_FACTOR = 8;

/**
 * The largest safe decimation factor for a given search range.
 *
 * Driven by the highest fundamental being looked for, because that is the
 * shortest period and therefore the one that runs out of resolution first.
 */
export function decimationFor(sampleRate: number, maxHz: number): number {
  if (!(sampleRate > 0) || !(maxHz > 0)) return 1;
  let factor = 1;
  while (
    factor * 2 <= MAX_FACTOR &&
    sampleRate / (factor * 2) / maxHz >= MIN_SAMPLES_PER_PERIOD
  ) {
    factor *= 2;
  }
  return factor;
}

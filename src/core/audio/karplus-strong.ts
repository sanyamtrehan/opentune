/**
 * Karplus-Strong plucked-string synthesis.
 *
 * A pure sine is genuinely hard to tune against: with no harmonics there are
 * no strong beats for the ear to lock onto. Karplus-Strong sounds like a
 * plucked string, hits any frequency exactly, and needs no audio assets — so
 * the PWA stays small and works offline. See AGENTS.md.
 *
 * Pure: takes numbers, returns samples. No Web Audio, no AudioContext. The
 * browser layer is a thin wrapper that copies the result into an AudioBuffer.
 */

/** Deterministic noise, so the same pluck is byte-identical across runs. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PluckOptions {
  /** Target pitch in Hz. Hit exactly, not quantised to the sample grid. */
  frequency: number;
  sampleRate: number;
  /** Length of the rendered buffer, in seconds. */
  duration: number;
  /**
   * Time to decay by 60 dB, in seconds. Specified in time rather than as a
   * loop gain so low and high strings ring for the same length.
   */
  sustain?: number;
  /** 0 is dark and mellow, 1 is bright and metallic. */
  brightness?: number;
  /** Peak amplitude of the rendered buffer. */
  gain?: number;
  seed?: number;
}

const DEFAULTS = {
  sustain: 3.5,
  brightness: 0.5,
  gain: 0.9,
  seed: 0x5eed,
};

/**
 * Render one plucked note.
 *
 * The loop is a delay line, a two-point averaging lowpass and an allpass. The
 * lowpass is what makes it decay like a string — high harmonics die first —
 * but it also delays by half a sample, and the allpass supplies whatever
 * fraction of a sample is left over. Without that fractional delay the
 * playable pitches would be quantised to sampleRate/N, which at the top of the
 * guitar's range is tens of cents wide: useless for a tuner.
 */
export function pluck(options: PluckOptions): Float32Array {
  const {
    frequency,
    sampleRate,
    duration,
    sustain = DEFAULTS.sustain,
    brightness = DEFAULTS.brightness,
    gain = DEFAULTS.gain,
    seed = DEFAULTS.seed,
  } = options;

  if (!(frequency > 0)) throw new RangeError(`frequency must be positive, got ${frequency}`);
  if (!(sampleRate > 0)) throw new RangeError(`sampleRate must be positive, got ${sampleRate}`);
  if (frequency >= sampleRate / 2) {
    throw new RangeError(`frequency ${frequency} is above the Nyquist limit`);
  }

  const totalDelay = sampleRate / frequency;

  // Split the loop delay three ways: an integer delay line, the lowpass's
  // half sample, and the allpass's fraction. The allpass misbehaves as its
  // coefficient approaches 1, so keep the fraction away from zero by
  // borrowing a whole sample from the delay line.
  let integerDelay = Math.floor(totalDelay - 0.5);
  let fraction = totalDelay - 0.5 - integerDelay;
  if (fraction < 0.1) {
    integerDelay -= 1;
    fraction += 1;
  }
  if (integerDelay < 2) {
    throw new RangeError(`frequency ${frequency} is too high for ${sampleRate} Hz`);
  }
  const allpassCoefficient = (1 - fraction) / (1 + fraction);

  // Per-loop gain that decays by 60 dB in `sustain` seconds. The loop runs
  // once per period, so the gain depends on frequency but the decay does not.
  const loopGain =
    sustain > 0 ? 10 ** (-3 / (sustain * frequency)) : 0;

  const random = mulberry32(seed);
  const line = new Float32Array(integerDelay);

  // Excitation: white noise, lowpassed towards the dark end. A raw noise
  // burst is convincing but harsh; rolling it off is the difference between
  // "plucked string" and "snapped rubber band".
  const excitationCutoff = 0.25 + 0.7 * Math.min(Math.max(brightness, 0), 1);
  let previous = 0;
  for (let i = 0; i < integerDelay; i += 1) {
    const white = random() * 2 - 1;
    previous += excitationCutoff * (white - previous);
    line[i] = previous;
  }

  const length = Math.max(1, Math.round(duration * sampleRate));
  const output = new Float32Array(length);

  let readIndex = 0;
  let lastSample = 0;
  let allpassInput = 0;
  let allpassOutput = 0;
  let peak = 0;

  for (let i = 0; i < length; i += 1) {
    const delayed = line[readIndex];
    output[i] = delayed;

    // Two-point average: the string's lowpass, and half a sample of delay.
    const lowpassed = 0.5 * (delayed + lastSample);
    lastSample = delayed;

    // First-order allpass for the remaining fraction of a sample.
    allpassOutput =
      allpassCoefficient * lowpassed +
      allpassInput -
      allpassCoefficient * allpassOutput;
    allpassInput = lowpassed;

    line[readIndex] = allpassOutput * loopGain;
    readIndex = (readIndex + 1) % integerDelay;

    const magnitude = Math.abs(output[i]);
    if (magnitude > peak) peak = magnitude;
  }

  // Normalise to the requested gain, and fade the tail so stopping the note
  // early cannot click.
  const scale = peak > 0 ? gain / peak : 0;
  const fadeSamples = Math.min(length, Math.round(0.01 * sampleRate));
  for (let i = 0; i < length; i += 1) {
    const remaining = length - i;
    const fade = remaining < fadeSamples ? remaining / fadeSamples : 1;
    output[i] *= scale * fade;
  }

  return output;
}

/**
 * Synthesised test signals with exactly known pitch.
 *
 * The point of the pure detector is that it can be checked against ground
 * truth rather than against someone's ears, and this is the ground truth.
 * These generators live in `src` rather than in the test file because the
 * `mic` mode work will keep reaching for them.
 *
 * This is only half the harness. The other half is real recordings of a real
 * guitar, which no amount of synthesis substitutes for — see docs/HANDOVER.md.
 */

export interface HarmonicOptions {
  frequency: number;
  sampleRate: number;
  duration: number;
  /**
   * Amplitude of each harmonic, fundamental first. Defaults to a rolloff that
   * roughly resembles a plucked string.
   */
  harmonics?: number[];
  /** Random phase offsets make the test less of a special case. Seeded. */
  seed?: number;
  /** White noise amplitude, relative to the signal. */
  noise?: number;
  /** Exponential decay time constant in seconds. 0 means no decay. */
  decay?: number;
  /**
   * Inharmonicity coefficient B, as in f(n) = n*f0*sqrt(1 + B*n^2).
   *
   * Real strings are stiff as well as tensioned, which pushes their upper
   * partials sharp. A plain steel string is around 1e-5; a wound low E is
   * nearer 5e-5.
   */
  inharmonicity?: number;
}

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

/** Typical plucked-string rolloff: the fundamental leads, harmonics decay. */
export const PLUCKED = [1, 0.6, 0.4, 0.25, 0.18, 0.12, 0.08];

/**
 * A wound low string as microphones actually hear it: the fundamental is
 * weaker than the second and third harmonics. This is the case that makes FFT
 * peak-picking report the wrong octave, and the reason this harness exists.
 */
export const WEAK_FUNDAMENTAL = [0.15, 1, 0.85, 0.5, 0.3, 0.2, 0.12];

/** An extreme version: essentially no energy at the fundamental at all. */
export const MISSING_FUNDAMENTAL = [0.02, 1, 0.9, 0.6, 0.35, 0.2];

export function harmonicTone(options: HarmonicOptions): Float32Array {
  const {
    frequency,
    sampleRate,
    duration,
    harmonics = PLUCKED,
    seed = 12345,
    noise = 0,
    decay = 0,
    inharmonicity = 0,
  } = options;

  const random = mulberry32(seed);
  const phases = harmonics.map(() => random() * 2 * Math.PI);
  const length = Math.round(duration * sampleRate);
  const output = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    const seconds = i / sampleRate;
    let value = 0;
    for (let h = 0; h < harmonics.length; h += 1) {
      const partial = h + 1;
      // Real strings are slightly sharp in their upper partials, because
      // stiffness matters as well as tension.
      const stretched =
        partial * Math.sqrt(1 + inharmonicity * partial * partial);
      value +=
        harmonics[h] *
        Math.sin(2 * Math.PI * frequency * stretched * seconds + phases[h]);
    }
    if (noise > 0) value += noise * (random() * 2 - 1);
    output[i] = decay > 0 ? value * Math.exp(-seconds / decay) : value;
  }

  // Normalise so amplitude never confounds a test that is about pitch.
  let peak = 0;
  for (const sample of output) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0) for (let i = 0; i < length; i += 1) output[i] /= peak;

  return output;
}

/** Band-unlimited noise, for asserting that clarity stays low on rubbish. */
export function whiteNoise(
  length: number,
  seed = 7,
): Float32Array {
  const random = mulberry32(seed);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) output[i] = random() * 2 - 1;
  return output;
}

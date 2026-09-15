/**
 * Deciding when the reference tone has stopped being a problem.
 *
 * Playing a target pitch through the speaker the microphone is pointed at
 * means the tuner hears its own note and reports it as perfectly in tune.
 * The blunt fix was to ignore every reading for the tone's full length, which
 * left the needle dead for four seconds after each tap — the exact moment the
 * player starts turning a peg.
 *
 * The better fix is to notice when the player joins in. A string next to the
 * phone is far louder than the phone's own speaker, so the level tells us,
 * and the level is already being measured for the silence gate. Once the
 * player is audible there is no point continuing the tone: it gets stopped,
 * and detection resumes immediately.
 *
 * Pure so the thresholds can be tested rather than felt.
 */

/**
 * Level readings during this opening window establish what the speaker alone
 * sounds like. Long enough to cover the pluck's attack and settle; short
 * enough that the player cannot beat it to the string.
 */
export const BASELINE_MS = 150;

/** How much louder than the tone the input must be to count as playing. */
export const PLAYING_RATIO = 3;

/** Absolute floor, so near-silence times can never look like a ratio jump. */
export const PLAYING_FLOOR_RMS = 0.01;

export interface ToneGateState {
  /** Loudest level seen while only the tone was sounding. */
  baselineRms: number;
  /** Milliseconds since the tone started. */
  elapsedMs: number;
}

export type ToneGateVerdict =
  /** Still measuring what the speaker sounds like; ignore pitch. */
  | "baseline"
  /** The tone is audible and nothing else is; ignore pitch. */
  | "tone-only"
  /** Something much louder arrived — stop the tone and trust readings again. */
  | "playing";

/**
 * Classify one level reading taken while the reference tone is sounding.
 *
 * `baselineRms` should be the running maximum of levels seen during the
 * baseline window — a maximum rather than an average, because the tone's own
 * attack is its loudest moment and comparing against a mean would trip on the
 * tone itself.
 */
export function toneGate(rms: number, state: ToneGateState): ToneGateVerdict {
  if (state.elapsedMs < BASELINE_MS) return "baseline";

  // A ratio alone is unsafe when the baseline is tiny: silence times three is
  // still silence, and a room's hum would read as a guitar.
  if (rms < PLAYING_FLOOR_RMS) return "tone-only";

  return rms > state.baselineRms * PLAYING_RATIO ? "playing" : "tone-only";
}

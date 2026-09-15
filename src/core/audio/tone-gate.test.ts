import test from "node:test";
import assert from "node:assert/strict";

import {
  BASELINE_MS,
  PLAYING_FLOOR_RMS,
  PLAYING_RATIO,
  toneGate,
} from "./tone-gate.ts";

/** The tone alone, at a speaker-ish level. */
const SPEAKER = 0.04;

test("the opening window is spent learning what the speaker sounds like", () => {
  const state = { baselineRms: 0, elapsedMs: 0 };
  assert.equal(toneGate(SPEAKER, state), "baseline");
  assert.equal(toneGate(SPEAKER, { ...state, elapsedMs: BASELINE_MS - 1 }), "baseline");
  // And it ends.
  assert.notEqual(toneGate(SPEAKER, { ...state, elapsedMs: BASELINE_MS }), "baseline");
});

test("the tone on its own never counts as playing", () => {
  const state = { baselineRms: SPEAKER, elapsedMs: 400 };
  assert.equal(toneGate(SPEAKER, state), "tone-only");
  // Even drifting up a little: speakers are not perfectly steady.
  assert.equal(toneGate(SPEAKER * 1.8, state), "tone-only");
  assert.equal(toneGate(SPEAKER * PLAYING_RATIO, state), "tone-only");
});

test("a plucked string next to the phone counts immediately", () => {
  const state = { baselineRms: SPEAKER, elapsedMs: 400 };
  assert.equal(toneGate(SPEAKER * 3.5, state), "playing");
  assert.equal(toneGate(0.4, state), "playing");
});

test("silence cannot be mistaken for playing, however quiet the baseline", () => {
  // The trap in a pure ratio test: three times nearly-nothing is still
  // nearly-nothing, and room hum would resume detection on its own.
  const state = { baselineRms: 0.0001, elapsedMs: 400 };
  assert.equal(toneGate(0.001, state), "tone-only");
  assert.equal(toneGate(PLAYING_FLOOR_RMS - 0.0001, state), "tone-only");
  assert.equal(toneGate(PLAYING_FLOOR_RMS * 2, state), "playing");
});

test("a silent tone — headphones, or muted output — still lets playing through", () => {
  // Nothing comes back through the speaker, so the baseline stays at zero and
  // the first real sound is the player.
  const state = { baselineRms: 0, elapsedMs: 400 };
  assert.equal(toneGate(0.05, state), "playing");
  assert.equal(toneGate(0.0001, state), "tone-only");
});

/**
 * Web Audio wrapper around the Karplus-Strong synth.
 *
 * All the DSP lives in `core/audio`, which knows nothing about browsers. This
 * file is the thin shell: it owns the AudioContext, renders buffers, and deals
 * with the fact that browsers will not make a sound until a user has touched
 * something.
 */

import { pluck } from "@/core/audio/karplus-strong.ts";

import { closeContext, currentContext, unlock } from "./context";

/** How long a rendered pluck lasts. Long enough to tune a string against. */
const NOTE_SECONDS = 4;

/** Fade applied when a note is cut off early, so stopping never clicks. */
const RELEASE_SECONDS = 0.08;

/** Rendering is not free, so identical pitches reuse their buffer. */
const bufferCache = new Map<string, AudioBuffer>();

let master: GainNode | null = null;
let active: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

/** The output stage, created on first use against the shared context. */
function masterFor(target: AudioContext): GainNode {
  if (!master) {
    master = target.createGain();
    master.gain.value = 1;
    master.connect(target.destination);
  }
  return master;
}

function bufferFor(target: AudioContext, frequency: number): AudioBuffer {
  // Round the key: two requests for the same string must not render twice
  // because of floating-point noise.
  const key = `${target.sampleRate}:${frequency.toFixed(3)}`;
  const cached = bufferCache.get(key);
  if (cached) return cached;

  const samples = pluck({
    frequency,
    sampleRate: target.sampleRate,
    duration: NOTE_SECONDS,
  });
  const buffer = target.createBuffer(1, samples.length, target.sampleRate);
  // `set` rather than `copyToChannel`: the synth returns a plain
  // Float32Array, which TypeScript will not narrow to an ArrayBuffer-backed
  // one, and the copy is identical.
  buffer.getChannelData(0).set(samples);
  bufferCache.set(key, buffer);
  return buffer;
}

/**
 * Stop whatever is currently sounding, with a short fade.
 *
 * Ear mode is monophonic on purpose: hearing two target pitches at once is
 * worse than useless when you are trying to match one of them.
 */
export function stop(): void {
  const context = currentContext();
  if (!context || !active) return;
  const { source, gain } = active;
  active = null;

  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
  source.stop(now + RELEASE_SECONDS);
}

/** Play a pitch. Resolves once the note has started, not when it ends. */
export async function play(frequency: number): Promise<void> {
  const target = await unlock();
  if (!target) return;
  const output = masterFor(target);

  stop();

  const source = target.createBufferSource();
  source.buffer = bufferFor(target, frequency);

  const gain = target.createGain();
  gain.gain.value = 1;

  source.connect(gain);
  gain.connect(output);

  const handle = { source, gain };
  source.onended = () => {
    if (active === handle) active = null;
    source.disconnect();
    gain.disconnect();
  };

  active = handle;
  source.start();
}

/** Release the audio hardware. Called when the tuner unmounts. */
export function dispose(): void {
  stop();
  bufferCache.clear();
  master = null;
  active = null;
  closeContext();
}

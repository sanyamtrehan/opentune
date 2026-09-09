/*
 * AudioWorklet shell around `detectPitch`.
 *
 * Deliberately thin: it accumulates 128-sample quanta into a frame long
 * enough for the string being listened to, calls the detector, and posts the
 * reading back. All the algorithm lives in src/core/audio/detect-pitch.ts,
 * which is prepended to this file by scripts/build-worklet.mjs — so there is
 * one implementation, tested in Node, and no copy to drift.
 *
 * Do not edit public/pitch-worklet.js. It is generated.
 */

/* global AudioWorkletProcessor, registerProcessor, sampleRate, currentTime */

/** Analysis runs this often at most, in seconds. ~20 Hz is plenty for a needle. */
const DEFAULT_HOP_SECONDS = 0.05;

/** Below this RMS there is nothing to analyse and we can save the CPU. */
const SILENCE_RMS = 0.001;

class PitchProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const settings = (options && options.processorOptions) || {};

    this.minHz = settings.minHz || 55;
    this.maxHz = settings.maxHz || 1400;
    this.hop = Math.max(
      128,
      Math.round((settings.hopSeconds || DEFAULT_HOP_SECONDS) * sampleRate),
    );

    this.resize(settings.windowSize || 4096);
    this.sinceAnalysis = 0;
    this.silent = true;

    // The main thread narrows the search range and the window whenever the
    // tuning or the selected string changes.
    this.port.onmessage = (event) => {
      const message = event.data || {};
      if (message.minHz > 0) this.minHz = message.minHz;
      if (message.maxHz > 0) this.maxHz = message.maxHz;
      if (message.windowSize > 0) this.resize(message.windowSize);
    };
  }

  resize(windowSize) {
    const size = Math.max(512, Math.min(16384, Math.ceil(windowSize)));
    if (this.window === size) return;
    this.window = size;
    // Keeping the ring exactly one window long means the frame is simply
    // "everything in the buffer", oldest sample first.
    this.ring = new Float32Array(size);
    this.frame = new Float32Array(size);
    this.writeIndex = 0;
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += 1) {
      this.ring[this.writeIndex] = channel[i];
      this.writeIndex = (this.writeIndex + 1) % this.window;
    }
    this.filled = Math.min(this.filled + channel.length, this.window);
    this.sinceAnalysis += channel.length;

    if (this.sinceAnalysis < this.hop || this.filled < this.window) return true;
    this.sinceAnalysis = 0;

    // Unwrap the ring into a contiguous frame, oldest sample first.
    const head = this.window - this.writeIndex;
    this.frame.set(this.ring.subarray(this.writeIndex), 0);
    this.frame.set(this.ring.subarray(0, this.writeIndex), head);

    let energy = 0;
    for (let i = 0; i < this.window; i += 1) energy += this.frame[i] * this.frame[i];
    const rms = Math.sqrt(energy / this.window);

    if (rms < SILENCE_RMS) {
      // Report silence once rather than every hop, so the main thread can
      // clear the needle without being woken twenty times a second.
      if (!this.silent) {
        this.silent = true;
        this.port.postMessage({ hz: 0, clarity: 0, rms, time: currentTime });
      }
      return true;
    }
    this.silent = false;

    const reading = detectPitch(this.frame, sampleRate, {
      minHz: this.minHz,
      maxHz: this.maxHz,
    });

    this.port.postMessage({
      hz: reading.hz,
      clarity: reading.clarity,
      rms,
      time: currentTime,
    });
    return true;
  }
}

registerProcessor("pitch-processor", PitchProcessor);

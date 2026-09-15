/**
 * Microphone capture for `mic` mode.
 *
 * Thin plumbing: open a stream, hand it to the pitch worklet, forward the
 * readings. The detector is pure and tested in Node; nothing here decides
 * anything about pitch.
 */

import type { PitchReading } from "@/core/music/types.ts";

import { unlock } from "./context";

/** The generated worklet. See scripts/build-worklet.mjs. */
const WORKLET_URL = "/pitch-worklet.js";

export interface ListenOptions {
  /**
   * The range worth searching, from the tuning. The worklet derives its own
   * frame length from `minHz` and the real sample rate — which only it knows.
   */
  minHz: number;
  maxHz: number;
  /** How often to analyse, in seconds. Shorter is a more responsive needle. */
  hopSeconds?: number;
}

export interface MicReading extends PitchReading {
  /** Level of the analysed frame, for a signal meter. */
  rms: number;
}

export type MicFailure =
  | "unsupported"
  | "denied"
  | "no-device"
  | "insecure"
  | "failed";

export class MicError extends Error {
  // Written out rather than declared as a parameter property, because core
  // and app code are both compiled with erasable syntax only.
  readonly reason: MicFailure;

  constructor(reason: MicFailure, message: string) {
    super(message);
    this.name = "MicError";
    this.reason = reason;
  }
}

export interface Listener {
  /** Narrow the search as the tuning or selected string changes. */
  update(options: Partial<ListenOptions>): void;
  stop(): void;
}

/**
 * Constraints that turn off everything the browser would otherwise "help"
 * with.
 *
 * This is the silent killer in AGENTS.md: `getUserMedia` defaults
 * echoCancellation, noiseSuppression and autoGainControl to on, all three are
 * tuned for speech, and all three mangle pitch content — AGC in particular
 * pumps the decay of a plucked string. Nothing warns you; the readings are
 * just quietly worse.
 */
const CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
  video: false,
};

function classify(error: unknown): MicError {
  const name = (error as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new MicError("denied", "Microphone access was refused.");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new MicError("no-device", "No microphone was found.");
  }
  return new MicError("failed", "The microphone could not be started.");
}

/**
 * Start listening. Must be called from a user gesture.
 *
 * iOS Safari requires both HTTPS and a real tap before audio starts, so the
 * insecure-context case is checked up front rather than surfacing later as a
 * mystery permission failure.
 */
export async function listen(
  options: ListenOptions,
  onReading: (reading: MicReading) => void,
): Promise<Listener> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MicError("unsupported", "This browser cannot record audio.");
  }
  if (!window.isSecureContext) {
    throw new MicError(
      "insecure",
      "Microphone access needs a secure (https) connection.",
    );
  }

  const context = await unlock();
  if (!context || !context.audioWorklet) {
    throw new MicError("unsupported", "This browser cannot record audio.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  } catch (error) {
    throw classify(error);
  }

  let node: AudioWorkletNode;
  let source: MediaStreamAudioSourceNode;
  try {
    await context.audioWorklet.addModule(WORKLET_URL);
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, "pitch-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: options,
    });
    source.connect(node);
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    throw classify(error);
  }

  node.port.onmessage = (event: MessageEvent<MicReading>) => onReading(event.data);

  let stopped = false;
  return {
    update(next) {
      if (!stopped) node.port.postMessage(next);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

"use client";

/**
 * Auto mode: the app listens and the needle moves.
 *
 * Called `mic` in code and "Auto" in the UI, per AGENTS.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { noteToFrequency } from "@/core/music/frequency.ts";
import type { Tuning } from "@/core/music/types.ts";
import { windowSizeFor } from "@/core/audio/detect-pitch.ts";
import { searchRange, targetString, trackString } from "@/core/tunings/target.ts";
import type { StringTarget } from "@/core/tunings/target.ts";

import { Headstock } from "./Headstock";
import { Readout } from "./Readout";
import { MicError, listen } from "../_audio/microphone";
import type { Listener, MicReading } from "../_audio/microphone";

/** Below this, a reading is a room rather than a string. */
const MIN_CLARITY = 0.9;

/** Readings kept for the median. Odd, and short enough to stay responsive. */
const MEDIAN_WINDOW = 5;

/** Clear the display after this long with nothing usable. */
const HOLD_MS = 1200;

type Status = "idle" | "starting" | "listening" | "error";

export interface MicModeProps {
  tuning: Tuning;
  reference: number;
}

export function MicMode({ tuning, reference }: MicModeProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const [target, setTarget] = useState<StringTarget | null>(null);

  const listener = useRef<Listener | null>(null);
  const history = useRef<number[]>([]);
  /** The string the last reading was attributed to. See `trackString`. */
  const following = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);

  // The reading handler is created once and installed on the worklet port,
  // so it must not close over a stale tuning. Readings arrive from outside
  // React, hence a ref rather than state — synced after commit, because
  // writing it during render would be a render side effect.
  const live = useRef({ tuning, reference, locked });
  useEffect(() => {
    live.current = { tuning, reference, locked };
  }, [locked, reference, tuning]);

  const stopListening = useCallback(() => {
    listener.current?.stop();
    listener.current = null;
    history.current = [];
    following.current = null;
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = null;
    setTarget(null);
    setStatus("idle");
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const onReading = useCallback((reading: MicReading) => {
    if (reading.clarity < MIN_CLARITY || reading.hz <= 0) return;

    /*
     * Median of the last few readings, not the newest one.
     *
     * A single frame can land an octave out when a pluck's attack is still
     * settling. A median throws that away without the lag an average over
     * the same window would add, and the needle stops twitching.
     */
    const recent = history.current;
    recent.push(reading.hz);
    if (recent.length > MEDIAN_WINDOW) recent.shift();
    const sorted = [...recent].sort((a, b) => a - b);
    const hz = sorted[sorted.length >> 1];

    const { tuning: current, reference: pitch, locked: held } = live.current;
    const found =
      held === null
        ? trackString(hz, current.strings, following.current, pitch)
        : targetString(hz, current.strings, held, pitch);
    if (found) {
      following.current = found.index;
      setTarget(found);
    }

    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      history.current = [];
      // Forget which string we were following too: after a silence, the next
      // pluck is as likely to be a different string as the same one.
      following.current = null;
      setTarget(null);
    }, HOLD_MS);
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    setProblem(null);
    try {
      const { minHz, maxHz } = searchRange(tuning.strings, reference);
      listener.current = await listen(
        {
          // Size the frame for the lowest string: it needs the longest window,
          // and one frame has to serve whichever string is played.
          windowSize: windowSizeFor(minHz, 48000),
          minHz,
          maxHz,
        },
        onReading,
      );
      setStatus("listening");
    } catch (error) {
      setProblem(
        error instanceof MicError
          ? error.message
          : "The microphone could not be started.",
      );
      setStatus("error");
    }
  }, [onReading, reference, tuning]);

  // Re-narrow the search when the tuning or reference changes mid-session.
  useEffect(() => {
    if (!listener.current) return;
    const { minHz, maxHz } = searchRange(tuning.strings, reference);
    listener.current.update({
      minHz,
      maxHz,
      windowSize: windowSizeFor(minHz, 48000),
    });
    history.current = [];
    following.current = null;
  }, [reference, tuning]);

  const listening = status === "listening";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Headstock
          strings={tuning.strings}
          selected={locked ?? target?.index ?? null}
          tuned={[]}
          cents={target?.cents ?? null}
          onSelect={(index) => setLocked(locked === index ? null : index)}
        />
      </div>

      <Readout
        note={target?.note ?? null}
        cents={target?.cents ?? null}
        stringNumber={target ? 6 - target.index : null}
        idleHint={listening ? "Play a string." : "Start listening to begin."}
      />

      <p className="text-center text-xs text-ink-faint">
        {locked === null
          ? "Listening to whichever string you play. Tap a peg to lock to one."
          : `Locked to ${6 - locked}${
              tuning.strings[locked]
                ? ` (${noteToFrequency(tuning.strings[locked], reference).toFixed(1)} Hz)`
                : ""
            }. Tap it again to unlock.`}
      </p>

      {problem && (
        <p className="text-center text-sm text-accent-bright">{problem}</p>
      )}

      <button
        type="button"
        onClick={listening ? stopListening : start}
        disabled={status === "starting"}
        className={`rounded-xl border py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright ${
          listening
            ? "border-edge text-ink-muted hover:text-ink"
            : "border-accent bg-accent text-ground disabled:border-edge disabled:bg-transparent disabled:text-ink-faint"
        }`}
      >
        {status === "starting"
          ? "Starting…"
          : listening
            ? "Stop listening"
            : "Start listening"}
      </button>
    </div>
  );
}

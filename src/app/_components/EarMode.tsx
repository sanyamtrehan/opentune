"use client";

/**
 * Custom mode: tap a peg, hear the pitch, tune to it.
 *
 * Called `ear` in code and "Custom" in the UI, per AGENTS.md. No microphone,
 * no permissions, no DSP — and on its own it already solves the grievance the
 * project exists for.
 */

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { formatNote } from "@/core/music/notes.ts";
import { noteToFrequency } from "@/core/music/frequency.ts";
import type { Tuning } from "@/core/music/types.ts";

import { Headstock } from "./Headstock";
import { play, stop } from "../_audio/pluck-voice";
import { isSupported } from "../_audio/context";

/** A note rings for four seconds; clear the highlight when it finishes. */
const RING_MS = 4000;

/** Audio support cannot change while the page is open, so there is nothing to
 *  subscribe to — but `useSyncExternalStore` still wants a subscribe. */
const subscribeNever = () => () => {};

export interface EarModeProps {
  tuning: Tuning;
  reference: number;
}

export function EarMode({ tuning, reference }: EarModeProps) {
  const [sounding, setSounding] = useState<number | null>(null);

  // Whether audio works is a fact about the browser, not React state. The
  // server has to guess, and guessing "yes" keeps its markup the same as what
  // a working browser hydrates — calling isSupported() during render would
  // prerender the failure message for everyone.
  const supported = useSyncExternalStore(subscribeNever, isSupported, () => true);

  // Silence whatever is ringing if the tuning or pitch changes underneath it.
  useEffect(() => {
    return () => {
      stop();
    };
  }, [tuning, reference]);

  useEffect(() => {
    if (sounding === null) return;
    const timer = window.setTimeout(() => setSounding(null), RING_MS);
    return () => window.clearTimeout(timer);
  }, [sounding]);

  const pluck = useCallback(
    (index: number) => {
      // Tapping the sounding peg again silences it.
      if (index === sounding) {
        stop();
        setSounding(null);
        return;
      }
      setSounding(index);
      void play(noteToFrequency(tuning.strings[index], reference));
    },
    [reference, sounding, tuning],
  );

  const note = sounding === null ? null : tuning.strings[sounding];

  return (
    <div className="flex flex-col gap-4">
      <Headstock strings={tuning.strings} sounding={sounding} onPluck={pluck} />

      <p className="min-h-[3.5rem] text-center text-sm text-ink-muted" aria-live="polite">
        {!supported ? (
          "This browser cannot play audio."
        ) : note ? (
          <>
            <span className="font-mono text-2xl text-accent-bright">
              {formatNote(note)}
            </span>
            <br />
            <span className="font-mono text-xs">
              {noteToFrequency(note, reference).toFixed(2)} Hz
            </span>
          </>
        ) : (
          "Tap a peg to hear its pitch, then tune the string to match."
        )}
      </p>
    </div>
  );
}

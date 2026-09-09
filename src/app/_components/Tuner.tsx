"use client";

/**
 * Ear mode — the whole of v1.
 *
 * Tap a peg, the app plays that string's pitch, you tune to it. No microphone,
 * no permissions, no DSP. This is a complete product on its own and it already
 * solves the grievance the project exists for: every alternate tuning, free.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { formatNote } from "@/core/music/notes.ts";
import { noteToFrequency } from "@/core/music/frequency.ts";
import { A440 } from "@/core/music/types.ts";
import { PRESETS, findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";

import { Headstock } from "./Headstock";
import { ReferencePitchControl } from "./ReferencePitchControl";
import { TuningPicker } from "./TuningPicker";
import { dispose, isSupported, play, stop } from "../_audio/pluck-voice";

/** A note rings for four seconds; clear the highlight when it finishes. */
const RING_MS = 4000;

/** Audio support cannot change while the page is open, so there is nothing
 * to subscribe to — but `useSyncExternalStore` still wants a subscribe. */
const subscribeNever = () => () => {};

export function Tuner() {
  const [tuningId, setTuningId] = useState("standard");
  const [reference, setReference] = useState<number>(A440);
  const [sounding, setSounding] = useState<number | null>(null);

  const tuning = useMemo(() => {
    const preset = findPreset(tuningId) ?? PRESETS[0];
    return resolveShape(preset);
  }, [tuningId]);

  // Whether audio works is a fact about the browser, not React state. The
  // server has to guess, and guessing "yes" keeps the markup it renders the
  // same as what a working browser hydrates.
  const supported = useSyncExternalStore(subscribeNever, isSupported, () => true);

  useEffect(() => () => dispose(), []);

  // Changing tuning or reference pitch mid-note would leave the old pitch
  // ringing against a label that no longer describes it. Silence in the
  // handler rather than reacting to the change afterwards.
  const changeTuning = useCallback((id: string) => {
    stop();
    setSounding(null);
    setTuningId(id);
  }, []);

  const changeReference = useCallback((hz: number) => {
    stop();
    setSounding(null);
    setReference(hz);
  }, []);

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

  const soundingNote = sounding === null ? null : tuning.strings[sounding];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">OpenTune</h1>
        <p className="text-xs uppercase tracking-widest text-ink-faint">
          Custom · by ear
        </p>
      </header>

      <TuningPicker presets={PRESETS} value={tuningId} onChange={changeTuning} />

      <Headstock
        strings={tuning.strings}
        sounding={sounding}
        onPluck={pluck}
      />

      <p
        className="min-h-[3rem] text-center text-sm text-ink-muted"
        aria-live="polite"
      >
        {!supported ? (
          "This browser cannot play audio."
        ) : soundingNote ? (
          <>
            <span className="font-mono text-2xl text-accent-bright">
              {formatNote(soundingNote)}
            </span>
            <br />
            <span className="font-mono text-xs">
              {noteToFrequency(soundingNote, reference).toFixed(2)} Hz
            </span>
          </>
        ) : (
          "Tap a peg to hear its pitch, then tune the string to match."
        )}
      </p>

      <ReferencePitchControl value={reference} onChange={changeReference} />

      <footer className="mt-auto pt-4 text-center text-xs text-ink-faint">
        {tuning.name} ·{" "}
        <span className="font-mono">
          {tuning.strings.map(formatNote).join(" ")}
        </span>
      </footer>
    </main>
  );
}

"use client";

/**
 * The tuner itself.
 *
 * One component for both modes, because the modes are no longer about which
 * hardware is in play — the microphone and the reference tone are available
 * in either. All that changes is how the string being tuned gets chosen:
 * `manual` waits for you to tap a peg, `follow` works it out from what you
 * play. See AGENTS.md.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { noteToFrequency } from "@/core/music/frequency.ts";
import { formatNote } from "@/core/music/notes.ts";
import type { Tuning } from "@/core/music/types.ts";
import { windowSizeFor } from "@/core/audio/detect-pitch.ts";
import {
  IN_TUNE_CENTS,
  searchRange,
  targetString,
  trackString,
} from "@/core/tunings/target.ts";
import type { StringTarget } from "@/core/tunings/target.ts";

import { Headstock } from "./Headstock";
import { Readout } from "./Readout";
import type { Mode } from "./ModeToggle";
import { isSupported } from "../_audio/context";
import { play, stop } from "../_audio/pluck-voice";
import { MicError, listen } from "../_audio/microphone";
import type { Listener, MicReading } from "../_audio/microphone";

/** Below this, a reading is a room rather than a string. */
const MIN_CLARITY = 0.9;

/** Readings kept for the median. Odd, and short enough to stay responsive. */
const MEDIAN_WINDOW = 5;

/** Clear the display after this long with nothing usable. */
const HOLD_MS = 1200;

/** How long a string must hold pitch before it counts as tuned. */
const TUNED_HOLD_MS = 700;

/** And how far it has to drift before it stops counting. Hysteresis: a string
 *  that flickers between tuned and not is worse than no indicator at all. */
const UNTUNED_CENTS = 10;

/** How long the reference tone rings. Must match pluck-voice. */
const TONE_MS = 4000;

/** Smoothing on the needle. The raw reading is too jittery to point at. */
const SMOOTHING = 0.35;

/** Audio support cannot change while the page is open. */
const subscribeNever = () => () => {};

/** Shared empty array, so "nothing tuned yet" is referentially stable. */
const EMPTY: number[] = [];

export interface TuningStageProps {
  tuning: Tuning;
  reference: number;
  mode: Mode;
}

export function TuningStage({ tuning, reference, mode }: TuningStageProps) {
  const [selected, setSelected] = useState(0);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [target, setTarget] = useState<StringTarget | null>(null);
  /** Bumped on every reference tone, so the string animation can restart
   *  even when the same string is played twice. */
  const [pluck, setPluck] = useState<{ index: number; nonce: number } | null>(null);

  /*
   * Tuned strings are stored with the tuning and pitch they were tuned to.
   * Changing either invalidates them — a string in tune for Drop D is not in
   * tune for Open G — and comparing the key during render is simpler and less
   * surprising than an effect that clears the list afterwards.
   */
  const settingKey = `${tuning.id}:${reference}`;
  const [tunedFor, setTunedFor] = useState<{ key: string; indexes: number[] }>({
    key: settingKey,
    indexes: [],
  });
  // Memoised so the empty case is a stable array: it feeds an effect
  // dependency, and a fresh [] each render would re-run it forever.
  const tuned = useMemo(
    () => (tunedFor.key === settingKey ? tunedFor.indexes : EMPTY),
    [settingKey, tunedFor],
  );

  const supported = useSyncExternalStore(subscribeNever, isSupported, () => true);

  const listener = useRef<Listener | null>(null);
  const history = useRef<number[]>([]);
  const following = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);
  const smoothed = useRef<number | null>(null);
  const inTuneSince = useRef<number | null>(null);
  /**
   * Readings are ignored until this time.
   *
   * The reference tone comes out of the same speaker the microphone is
   * pointed at, so without this the tuner hears its own note and reports it
   * as perfectly in tune. Nobody is helped by a tuner that agrees with itself.
   */
  const mutedUntil = useRef(0);
  /** Mirror of `tuned`, readable from the reading handler without stale
   *  closures, so arriving at pitch can be detected as a transition. */
  const tunedRef = useRef<number[]>([]);

  // The reading handler is installed on the worklet port once, so it must not
  // close over stale props. Synced after commit, never during render.
  const live = useRef({ tuning, reference, mode, selected, settingKey });
  useEffect(() => {
    live.current = { tuning, reference, mode, selected, settingKey };
    tunedRef.current = tuned;
  }, [mode, reference, selected, settingKey, tuned, tuning]);

  const resetTracking = useCallback(() => {
    history.current = [];
    following.current = null;
    smoothed.current = null;
    inTuneSince.current = null;
  }, []);

  const stopListening = useCallback(() => {
    listener.current?.stop();
    listener.current = null;
    resetTracking();
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = null;
    setTarget(null);
    setListening(false);
  }, [resetTracking]);

  useEffect(() => stopListening, [stopListening]);

  const onReading = useCallback((reading: MicReading) => {
    if (performance.now() < mutedUntil.current) return;
    if (reading.clarity < MIN_CLARITY || reading.hz <= 0) return;

    // Median of the last few frames, not the newest. A single frame can land
    // an octave out while a pluck's attack settles; a median discards that
    // without the lag an average over the same window would add.
    const recent = history.current;
    recent.push(reading.hz);
    if (recent.length > MEDIAN_WINDOW) recent.shift();
    const sorted = [...recent].sort((a, b) => a - b);
    const hz = sorted[sorted.length >> 1];

    const current = live.current;
    const found =
      current.mode === "follow"
        ? trackString(hz, current.tuning.strings, following.current, current.reference)
        : targetString(hz, current.tuning.strings, current.selected, current.reference);

    if (found) {
      following.current = found.index;
      if (current.mode === "follow" && found.index !== current.selected) {
        setSelected(found.index);
        smoothed.current = null;
        inTuneSince.current = null;
      }

      const previous = smoothed.current;
      const value =
        previous === null ? found.cents : previous + (found.cents - previous) * SMOOTHING;
      smoothed.current = value;
      setTarget({ ...found, cents: value });

      // Tuned is earned by holding pitch, not by passing through it.
      if (Math.abs(value) <= IN_TUNE_CENTS) {
        inTuneSince.current ??= performance.now();
        if (
          performance.now() - inTuneSince.current > TUNED_HOLD_MS &&
          !tunedRef.current.includes(found.index)
        ) {
          tunedRef.current = [...tunedRef.current, found.index];
          // A short buzz at the moment it lands, because the player is
          // looking at the neck and the fingers, not at the screen.
          navigator.vibrate?.(35);
          setTunedFor({ key: current.settingKey, indexes: tunedRef.current });
        }
      } else {
        inTuneSince.current = null;
        if (Math.abs(value) > UNTUNED_CENTS && tunedRef.current.includes(found.index)) {
          tunedRef.current = tunedRef.current.filter((i) => i !== found.index);
          setTunedFor({ key: current.settingKey, indexes: tunedRef.current });
        }
      }
    }

    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      resetTracking();
      setTarget(null);
    }, HOLD_MS);
  }, [resetTracking]);

  const startListening = useCallback(async () => {
    setStarting(true);
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
      setListening(true);
    } catch (error) {
      setProblem(
        error instanceof MicError ? error.message : "The microphone could not be started.",
      );
    } finally {
      setStarting(false);
    }
  }, [onReading, reference, tuning]);

  // Re-narrow the search when the tuning or reference changes mid-session.
  useEffect(() => {
    if (!listener.current) return;
    const { minHz, maxHz } = searchRange(tuning.strings, reference);
    listener.current.update({ minHz, maxHz, windowSize: windowSizeFor(minHz, 48000) });
    history.current = [];
    following.current = null;
    smoothed.current = null;
  }, [reference, tuning]);

  const hear = useCallback(
    (index: number) => {
      mutedUntil.current = performance.now() + TONE_MS;
      setPluck((previous) => ({ index, nonce: (previous?.nonce ?? 0) + 1 }));
      void play(noteToFrequency(tuning.strings[index], reference));
    },
    [reference, tuning],
  );

  const selectPeg = useCallback(
    (index: number) => {
      // Tapping the string that is already selected silences the reference
      // tone. Without this there is no way to stop it early, and while it
      // rings the microphone is deaf — so the tuner would appear frozen for
      // four seconds after every tap.
      const ringing = performance.now() < mutedUntil.current;
      if (index === selected && ringing) {
        stop();
        mutedUntil.current = 0;
        return;
      }
      smoothed.current = null;
      inTuneSince.current = null;
      setSelected(index);
      setTarget(null);
      hear(index);
    },
    [hear, selected],
  );

  const note = tuning.strings[selected];

  return (
    /*
     * In a short, wide window the stage and controls sit side by side with
     * the headstock on the right. See the `wide-short` variant.
     *
     * The stage is `flex-[1_1_0]`, not `auto`. With an auto basis its width
     * depends on the SVG, whose width depends on the stage — the browser
     * resolves that circle by overflowing, which clipped the headstock off
     * the bottom of the screen. A zero basis makes the width a share of the
     * row, so the SVG has something definite to letter-box itself into.
     */
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden wide-short:flex-row-reverse wide-short:items-stretch wide-short:justify-center wide-short:gap-6 wide-short:py-2">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden wide-short:flex-[1_1_0]">
        <Headstock
          strings={tuning.strings}
          selected={selected}
          tuned={tuned}
          cents={target?.cents ?? null}
          pluck={pluck}
          onSelect={selectPeg}
        />
      </div>

      <div className="flex flex-none flex-col wide-short:flex-[0_0_19rem] wide-short:justify-center wide-short:gap-3 wide-short:self-center">

      <Readout
        note={target ? target.note : note}
        cents={target?.cents ?? null}
        stringNumber={6 - (target?.index ?? selected)}
        idleHint={
          !supported
            ? "This browser cannot play audio."
            : listening
              ? mode === "follow"
                ? "Play any string."
                : `Play string ${6 - selected}.`
              : "Tap a peg to hear it, or start listening."
        }
      />

      <div className="mx-auto flex w-full flex-none flex-col gap-2 px-[clamp(1rem,4vw,1.75rem)] pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* One dot per string, so progress through a tuning is visible
            without reading six labels. */}
        <div className="flex items-center justify-center gap-[7px]">
          {tuning.strings.map((_, index) => (
            <span
              key={index}
              className={`h-[7px] rounded-full transition-all duration-200 ${
                index === selected ? "w-5" : "w-[7px]"
              } ${
                tuned.includes(index)
                  ? "bg-tuned"
                  : index === selected
                    ? "bg-accent"
                    : "bg-[#2c2c2c]"
              }`}
            />
          ))}
        </div>

        {problem && <p className="text-center text-xs text-warn">{problem}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={starting || !supported}
            className={`flex-1 cursor-pointer rounded-[0.8125rem] py-[0.9375rem] text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              listening
                ? "bg-panel-raised text-accent shadow-[inset_0_0_0_1px_#3a2a0a]"
                : "bg-accent text-ground"
            }`}
          >
            {starting ? "Starting…" : listening ? "Stop listening" : "Start listening"}
          </button>
          <button
            type="button"
            onClick={() => hear(selected)}
            disabled={!supported}
            className="flex-none basis-[40%] cursor-pointer rounded-[0.8125rem] border border-edge bg-panel py-[0.9375rem] text-sm text-ink hover:border-accent-edge disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hear {note ? formatNote(note) : "—"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

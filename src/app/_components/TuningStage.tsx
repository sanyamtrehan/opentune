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
import {
  IN_TUNE_CENTS,
  searchRange,
  stringRange,
  targetString,
  trackString,
} from "@/core/tunings/target.ts";
import type { StringTarget } from "@/core/tunings/target.ts";

import { Headstock } from "./Headstock";
import { Readout } from "./Readout";
import type { Mode } from "./ModeToggle";
import { isSupported } from "../_audio/context";
import { NOTE_SECONDS, play, stop } from "../_audio/pluck-voice";
import { toneGate } from "@/core/audio/tone-gate.ts";

import { MicError, listen } from "../_audio/microphone";
import type { Listener, MicReading } from "../_audio/microphone";

/** Below this, a reading is a room rather than a string. */
const MIN_CLARITY = 0.9;

/**
 * Readings kept for the median. Odd, and short enough to stay responsive.
 *
 * Three, not five: the median exists to throw away the occasional frame that
 * lands an octave out, and three is enough for that. Five held 250ms of
 * history and was a large part of why the needle felt laggy.
 */
const MEDIAN_WINDOW = 3;

/** Clear the display after this long with nothing usable. */
const HOLD_MS = 1200;

/** How long a string must hold pitch before it counts as tuned. */
const TUNED_HOLD_MS = 700;

/** And how far it has to drift before it stops counting. Hysteresis: a string
 *  that flickers between tuned and not is worse than no indicator at all. */
const UNTUNED_CENTS = 10;

/**
 * Smoothing on the needle, as an EMA coefficient.
 *
 * Two values, because the needle has two jobs. While the player is turning a
 * peg the reading is genuinely moving and the needle should keep up; once it
 * is nearly there, the remaining movement is noise and should be damped. A
 * single coefficient has to choose between feeling laggy and feeling jittery.
 */
const SMOOTHING_SETTLED = 0.3;
const SMOOTHING_MOVING = 0.7;

/** Above this much change between readings, assume the peg is being turned. */
const MOVING_CENTS = 15;

/** How often the worklet analyses. 40 readings a second. */
const HOP_SECONDS = 0.025;

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
   * State of the reference tone, while it is sounding.
   *
   * The tone comes out of the same speaker the microphone is pointed at, so
   * its readings have to be ignored — otherwise the tuner hears its own note
   * and calls it perfectly in tune. Rather than ignore a fixed four seconds,
   * the level is watched: once the player is clearly audible over the
   * speaker, the tone is stopped and readings are trusted again. See
   * `core/audio/tone-gate.ts`.
   */
  const tone = useRef<{ startedAt: number; baselineRms: number } | null>(null);
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
    tone.current = null;
    resetTracking();
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    clearTimer.current = null;
    setTarget(null);
    setListening(false);
  }, [resetTracking]);

  useEffect(() => stopListening, [stopListening]);

  const onReading = useCallback((reading: MicReading) => {
    const ringing = tone.current;
    if (ringing) {
      const elapsedMs = performance.now() - ringing.startedAt;
      const verdict = toneGate(reading.rms, {
        baselineRms: ringing.baselineRms,
        elapsedMs,
      });
      if (verdict === "baseline") {
        // Learn the loudest the speaker alone gets, so the comparison later
        // is against the tone rather than against silence.
        ringing.baselineRms = Math.max(ringing.baselineRms, reading.rms);
        return;
      }
      if (verdict === "tone-only") return;
      // The player has joined in. The tone has done its job.
      tone.current = null;
      stop();
    }

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
      const change = previous === null ? 0 : found.cents - previous;
      const alpha =
        Math.abs(change) > MOVING_CENTS ? SMOOTHING_MOVING : SMOOTHING_SETTLED;
      const value = previous === null ? found.cents : previous + change * alpha;
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

  /**
   * What to ask the worklet to listen for.
   *
   * In manual mode the player has told us the string, so the range narrows to
   * it and the window gets much shorter — the high E drops from 92ms to 23ms,
   * which is most of the needle's latency. Follow mode has to keep the full
   * range, because a range that tight cannot see the other five strings.
   */
  const rangeFor = useCallback(
    (which: Mode, index: number) => {
      const narrow = which === "manual" ? stringRange(tuning.strings, index, reference) : null;
      return narrow ?? searchRange(tuning.strings, reference);
    },
    [reference, tuning],
  );

  const startListening = useCallback(async () => {
    setStarting(true);
    setProblem(null);
    // A note left ringing from before would be the first thing the microphone
    // heard, and it would read as perfectly in tune.
    stop();
    tone.current = null;
    try {
      const { minHz, maxHz } = rangeFor(mode, selected);
      listener.current = await listen(
        { minHz, maxHz, hopSeconds: HOP_SECONDS },
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
  }, [mode, onReading, rangeFor, selected]);

  // Re-narrow the search whenever the tuning, the pitch, the mode or the
  // chosen string changes. In manual mode that last one is the important
  // case: each peg tap shortens the window to fit that string.
  useEffect(() => {
    if (!listener.current) return;
    const { minHz, maxHz } = rangeFor(mode, selected);
    listener.current.update({ minHz, maxHz });
    history.current = [];
    following.current = null;
    smoothed.current = null;
  }, [mode, rangeFor, selected]);

  const hear = useCallback(
    (index: number) => {
      setPluck((previous) => ({ index, nonce: (previous?.nonce ?? 0) + 1 }));
      void play(noteToFrequency(tuning.strings[index], reference));

      // Only worth tracking while the microphone is on; with it off there is
      // nothing to protect from the speaker.
      tone.current = listening
        ? { startedAt: performance.now(), baselineRms: 0 }
        : null;
      if (listening) {
        // Whatever happens, stop watching once the note could not still be
        // sounding — a player who never joins in should not leave the gate
        // armed forever.
        window.setTimeout(() => {
          tone.current = null;
        }, NOTE_SECONDS * 1000);
      }
    },
    [listening, reference, tuning],
  );

  const selectPeg = useCallback(
    (index: number) => {
      // Tapping the string that is already selected silences the tone, for a
      // player who wants quiet rather than to play along.
      if (index === selected && tone.current) {
        stop();
        tone.current = null;
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
     * Above 780px the stage and the controls sit side by side with the
     * headstock on the right, per the v2 design. The stage box carries the
     * drawing's aspect ratio and sizes from its height, which is what keeps
     * the pegs landing on the posts.
     */
    <div className="flex min-h-0 w-full flex-1 flex-col min-[780px]:mx-auto min-[780px]:max-w-[1080px] min-[780px]:flex-row-reverse min-[780px]:items-center min-[780px]:justify-center min-[780px]:gap-[clamp(24px,5vw,72px)] min-[780px]:px-[clamp(16px,4vw,40px)] min-[780px]:pt-2 min-[780px]:pb-1">
      {/* `w-auto` in the wide branch matters: leaving width:100% here lets the
          stage claim the whole row and squeezes the controls column down to
          its minimum content width. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-[clamp(12px,3vw,24px)] min-[780px]:h-full min-[780px]:w-auto min-[780px]:flex-[0_1_auto] min-[780px]:p-0">
        <Headstock
          strings={tuning.strings}
          selected={selected}
          tuned={tuned}
          cents={target?.cents ?? null}
          pluck={pluck}
          onSelect={selectPeg}
        />
      </div>

      <div className="flex min-h-0 w-full flex-none flex-col justify-center min-[780px]:w-auto min-[780px]:flex-[0_1_360px] min-[780px]:gap-5">

      <Readout
        note={target?.note ?? null}
        cents={target?.cents ?? null}
        stringNumber={6 - (target?.index ?? selected)}
        idleHint={
          !supported
            ? "This browser cannot play audio."
            : listening
              ? mode === "follow"
                ? "Play any string."
                : `Play string ${6 - selected}.`
              : "Tap a peg to begin."
        }
      />

      <div className="mx-auto flex w-full max-w-[560px] flex-none flex-col gap-2 px-[clamp(16px,4vw,28px)] pt-2 pb-[max(14px,env(safe-area-inset-bottom))]">
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
                    ? "bg-tuning"
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
            // Blue, not amber: this is an action. Amber now means one thing
            // only — the string being tuned — and a big amber button next to
            // an amber peg dilutes that back into decoration.
            className={`flex-1 cursor-pointer rounded-[13px] py-[15px] text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              listening
                ? "bg-panel-raised text-accent shadow-[inset_0_0_0_1px_var(--color-accent-edge)]"
                : "bg-accent text-ground"
            }`}
          >
            {starting ? "Starting…" : listening ? "Stop listening" : "Start listening"}
          </button>
          <button
            type="button"
            onClick={() => hear(selected)}
            disabled={!supported}
            className="flex-none basis-[40%] cursor-pointer rounded-[13px] border border-[#262626] bg-panel py-[15px] text-[14px] text-[#d8d8d8] hover:border-tuning-edge disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hear {note ? formatNote(note) : "—"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Build a tuning by ear-adjacent means: nudge each string up or down a
 * semitone and hear it. Editing by semitone rather than typing note names is
 * how people actually think about this — "drop the low one a tone" — and it
 * makes an invalid tuning nearly impossible to enter.
 */

import { useCallback, useMemo, useState } from "react";

import { formatNote, midiOf, noteFromMidi } from "@/core/music/notes.ts";
import { noteToFrequency } from "@/core/music/frequency.ts";
import type { Note } from "@/core/music/types.ts";
import { PRESETS } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";
import {
  HIGHEST_MIDI,
  LOWEST_MIDI,
  identifyTuning,
  validateStrings,
} from "@/core/tunings/custom.ts";
import { spellFromRoot } from "@/core/tunings/spelling.ts";

import { play } from "../_audio/pluck-voice";

export interface TuningEditorProps {
  /** Where to start from — normally whatever is currently selected. */
  initial: Note[];
  initialName: string;
  reference: number;
  onSave: (name: string, strings: Note[]) => void;
  onCancel: () => void;
}

export function TuningEditor({
  initial,
  initialName,
  reference,
  onSave,
  onCancel,
}: TuningEditorProps) {
  const [midis, setMidis] = useState<number[]>(() => initial.map(midiOf));
  const [name, setName] = useState(initialName);

  // Respelled as a set, so a nudge that turns the tuning into Open D shows
  // F# rather than leaving one string spelled against the others.
  const strings = useMemo(() => spellFromRoot(midis, midis[0]), [midis]);

  const problem = useMemo(() => validateStrings(strings), [strings]);

  const alreadyNamed = useMemo(
    () => identifyTuning(strings, PRESETS, resolveShape),
    [strings],
  );

  // Playing lives outside the state updater: React may call an updater more
  // than once, and a doubled pluck is audible.
  const nudge = useCallback(
    (index: number, semitones: number) => {
      const moved = midis[index] + semitones;
      if (moved < LOWEST_MIDI || moved > HIGHEST_MIDI) return;
      setMidis(midis.map((midi, at) => (at === index ? moved : midi)));
      void play(noteToFrequency(noteFromMidi(moved), reference));
    },
    [midis, reference],
  );

  const trimmed = name.trim();
  const canSave = problem === null && trimmed.length > 0;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-edge bg-panel/60 p-5">
      <h2 className="text-sm font-medium uppercase tracking-widest text-ink-muted">
        New tuning
      </h2>

      <ul className="flex flex-col gap-2">
        {strings.map((note, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-ink-faint">
              String {6 - index}
            </span>
            <button
              type="button"
              onClick={() => nudge(index, -1)}
              aria-label={`Lower string ${6 - index} by a semitone`}
              className="h-10 w-10 rounded-lg border border-edge text-lg text-ink-muted hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => void play(noteToFrequency(note, reference))}
              aria-label={`Play ${formatNote(note)}`}
              className="flex-1 rounded-lg border border-edge bg-ground py-2 font-mono text-lg tabular-nums hover:border-accent-dim hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
            >
              {formatNote(note)}
            </button>
            <button
              type="button"
              onClick={() => nudge(index, 1)}
              aria-label={`Raise string ${6 - index} by a semitone`}
              className="h-10 w-10 rounded-lg border border-edge text-lg text-ink-muted hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          Name
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          placeholder="My tuning"
          className="rounded-xl border border-edge bg-ground px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
        />
      </label>

      <p className="min-h-[1.5rem] text-xs" aria-live="polite">
        {problem ? (
          <span className="text-accent-bright">{problem}</span>
        ) : alreadyNamed ? (
          <span className="text-ink-muted">
            This is {alreadyNamed.name} — already in the list.
          </span>
        ) : null}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-edge py-3 text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(trimmed, strings)}
          className="flex-1 rounded-xl border border-accent bg-accent py-3 text-sm font-medium text-ground disabled:cursor-not-allowed disabled:border-edge disabled:bg-transparent disabled:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
        >
          Save tuning
        </button>
      </div>
    </section>
  );
}

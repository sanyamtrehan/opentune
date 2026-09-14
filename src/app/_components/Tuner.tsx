"use client";

/**
 * The tuner shell: tuning, reference pitch, saved tunings, and which of the
 * two modes is showing. The modes themselves own their audio.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { formatNote } from "@/core/music/notes.ts";
import { A440 } from "@/core/music/types.ts";
import type { Note, Tuning } from "@/core/music/types.ts";
import { PRESETS, findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";
import { newTuningId, userTuning } from "@/core/tunings/custom.ts";

import { EarMode } from "./EarMode";
import { MicMode } from "./MicMode";
import { ModeToggle } from "./ModeToggle";
import type { Mode } from "./ModeToggle";
import { ReferencePitchControl } from "./ReferencePitchControl";
import { TuningEditor } from "./TuningEditor";
import { TuningPicker } from "./TuningPicker";
import { stop } from "../_audio/pluck-voice";
import {
  addTuning,
  getServerSnapshot,
  getSnapshot,
  removeTuning,
  subscribe,
} from "../_storage/saved-tunings";

export function Tuner() {
  const [mode, setMode] = useState<Mode>("ear");
  const [tuningId, setTuningId] = useState("standard");
  const [reference, setReference] = useState<number>(A440);
  const [editing, setEditing] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const saved = useMemo<Tuning[]>(
    () =>
      stored.map((entry) =>
        userTuning(entry.strings, { id: entry.id, name: entry.name }),
      ),
    [stored],
  );

  const tuning = useMemo(() => {
    const mine = saved.find((entry) => entry.id === tuningId);
    if (mine) return mine;
    const preset = findPreset(tuningId) ?? PRESETS[0];
    return resolveShape(preset);
  }, [saved, tuningId]);

  const changeTuning = useCallback((id: string) => {
    stop();
    setTuningId(id);
  }, []);

  const changeReference = useCallback((hz: number) => {
    stop();
    setReference(hz);
  }, []);

  const changeMode = useCallback((next: Mode) => {
    stop();
    setEditing(false);
    setMode(next);
  }, []);

  const saveTuning = useCallback((name: string, strings: Note[]) => {
    const id = newTuningId();
    setStorageFailed(!addTuning({ id, name, strings }));
    setTuningId(id);
    setEditing(false);
    stop();
  }, []);

  const deleteTuning = useCallback(() => {
    setStorageFailed(!removeTuning(tuningId));
    setTuningId("standard");
    stop();
  }, [tuningId]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">OpenTune</h1>
        <p className="text-xs uppercase tracking-widest text-ink-faint">
          Every tuning, free
        </p>
      </header>

      <ModeToggle value={mode} onChange={changeMode} />

      <TuningPicker
        presets={PRESETS}
        saved={saved}
        value={tuningId}
        onChange={changeTuning}
      />

      {/* Keyed so switching mode tears the old one down rather than leaving a
          microphone open or a note ringing. */}
      {mode === "ear" ? (
        <EarMode key="ear" tuning={tuning} reference={reference} />
      ) : (
        <MicMode key="mic" tuning={tuning} reference={reference} />
      )}

      <ReferencePitchControl value={reference} onChange={changeReference} />

      {editing ? (
        <TuningEditor
          initial={tuning.strings}
          initialName={`${tuning.name} variant`}
          reference={reference}
          onSave={saveTuning}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              stop();
              setEditing(true);
            }}
            className="flex-1 rounded-xl border border-edge py-3 text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
          >
            {tuning.userDefined ? "Build another" : "Build your own"}
          </button>
          {tuning.userDefined && (
            <button
              type="button"
              onClick={deleteTuning}
              className="rounded-xl border border-edge px-4 py-3 text-sm text-ink-muted hover:border-accent-edge hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {storageFailed && (
        <p className="text-center text-xs text-accent-bright">
          This browser would not save the tuning — it will be gone when you
          reload.
        </p>
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-ink-faint">
        {tuning.name} ·{" "}
        <span className="font-mono">
          {tuning.strings.map(formatNote).join(" ")}
        </span>
      </footer>
    </main>
  );
}

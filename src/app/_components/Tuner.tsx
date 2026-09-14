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

import { ModeToggle } from "./ModeToggle";
import type { Mode } from "./ModeToggle";
import { Header } from "./Header";
import { TuningStage } from "./TuningStage";
import { TuningEditor } from "./TuningEditor";
import { TuningSheet } from "./TuningSheet";
import { stop } from "../_audio/pluck-voice";
import {
  addTuning,
  getServerSnapshot,
  getSnapshot,
  removeTuning,
  subscribe,
} from "../_storage/saved-tunings";

export function Tuner() {
  const [mode, setMode] = useState<Mode>("manual");
  const [tuningId, setTuningId] = useState("standard");
  const [reference, setReference] = useState<number>(A440);
  const [editing, setEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      <div className="mx-auto flex w-full max-w-[38.75rem] flex-none items-center gap-2.5 px-[clamp(1rem,4vw,1.75rem)] pb-1.5">
        <ModeToggle value={mode} onChange={changeMode} />

        {/* Tuning and reference pitch share one control: they are the same
            question — what am I tuning to — and they were two separate blocks
            competing with the headstock for attention. */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-edge bg-panel px-3.5 py-[0.5625rem] text-left text-sm text-ink hover:border-accent-edge"
        >
          <span className="truncate">{tuning.name}</span>
          <span className="flex-none font-mono text-[11px] whitespace-nowrap text-ink-faint">
            A4 {reference} ▾
          </span>
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <TuningStage tuning={tuning} reference={reference} mode={mode} />

        {editing && (
          <div className="mt-4">
            <TuningEditor
              initial={tuning.strings}
              initialName={`${tuning.name} variant`}
              reference={reference}
              onSave={saveTuning}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {tuning.userDefined && !editing && (
          <button
            type="button"
            onClick={deleteTuning}
            className="mt-3 self-center rounded-xl border border-edge px-4 py-2 text-xs text-ink-muted hover:border-accent-edge hover:text-accent"
          >
            Delete “{tuning.name}”
          </button>
        )}

        {storageFailed && (
          <p className="mt-3 text-center text-xs text-warn">
            This browser would not save the tuning — it will be gone when you
            reload.
          </p>
        )}

        <footer className="mt-auto py-3 text-center">
          <span className="font-mono text-[11px] tracking-wider text-ink-faint">
            {tuning.strings.map(formatNote).join(" ")}
          </span>
        </footer>
      </div>

      <TuningSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        presets={PRESETS}
        saved={saved}
        value={tuningId}
        onPick={changeTuning}
        reference={reference}
        onReference={changeReference}
        onBuildOwn={() => {
          stop();
          setEditing(true);
        }}
      />
    </div>
  );
}

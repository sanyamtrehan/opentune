"use client";

/**
 * The scale explorer.
 *
 * Controls:
 *   - Root: 12-tab scroll row. Arrow ← / → keys also cycle through roots.
 *   - Scale: a second scroll row — major, minor, the other five modes and the
 *     two altered minors. A segmented toggle held two; nine want a row that
 *     scrolls, and it matches the roots above it.
 *   - Orientation: Horizontal (wide neck) / Vertical (chord-box style).
 *   - All notes: shows every note on the neck, not just scale tones.
 *   - Frets 13–24: extends the neck to cover the repeated upper octave.
 *   - Pro: fills the note beside the neck with what the scale is doing.
 *
 * The note is the chord page's, in both senses: the same sheet of paper, and
 * the same bargain — a diagram says where to put your fingers and the note
 * says what comes out and why.
 */

import { useState } from "react";

import { rootName } from "@/core/music/chords.ts";
import { SCALES, SCALE_NAMES, scaleRoot, scaleTitle } from "@/core/music/scales.ts";
import type { ScaleName } from "@/core/music/scales.ts";

import { Header } from "./Header";
import { NoteSheet } from "./NoteSheet";
import { ScrollRow } from "./ScrollRow";
import { ScaleDiagram } from "./ScaleDiagram";
import { ScaleInfoPane } from "./ScaleInfoPane";

export function ScaleBrowser() {
  const [rootPitchClass, setRootPitchClass] = useState(0); // C
  const [scale, setScale] = useState<ScaleName>("major");
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const [showAll, setShowAll] = useState(true);
  const [showExtended, setShowExtended] = useState(false);
  const [pro, setPro] = useState(false);
  // Phone only: the note is pulled up over the page. Ignored above 900px,
  // where it is simply beside the neck.
  const [noteUp, setNoteUp] = useState(false);

  // The root's name depends on the scale: pitch class 1 is D♭ in major and
  // C♯ in Phrygian, because spelling D♭ Phrygian costs two double flats.
  const root = scaleRoot(rootPitchClass, scale);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* Root note tabs */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Scale root">
          {Array.from({ length: 12 }, (_, pitchClass) => {
            const selected = pitchClass === rootPitchClass;
            return (
              <button
                key={pitchClass}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setRootPitchClass(pitchClass)}
                className={`min-w-[44px] cursor-pointer rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:min-w-[54px] min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                  selected
                    ? "bg-accent-bg text-accent"
                    : "text-ink hover:text-accent-bright"
                }`}
              >
                {rootName(scaleRoot(pitchClass, scale))}
              </button>
            );
          })}
        </ScrollRow>
      </div>

      {/* Scale tabs */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Scale">
          {SCALE_NAMES.map((name) => {
            const selected = name === scale;
            return (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={selected}
                title={SCALES[name].hint}
                onClick={() => setScale(name)}
                className={`cursor-pointer whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                  selected
                    ? "bg-accent-bg text-accent"
                    : "text-ink hover:text-accent-bright"
                }`}
              >
                {SCALES[name].name}
              </button>
            );
          })}
        </ScrollRow>
      </div>

      {/* What the chosen scale is, said against major or minor */}
      <p className="mx-auto w-full max-w-[1240px] flex-none px-[clamp(16px,4vw,28px)] pb-2 text-[12px] text-ink-faint min-[900px]:text-[13px]">
        {SCALES[scale].hint}
      </p>

      {/* Controls row */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none flex-wrap items-center gap-2 px-[clamp(16px,4vw,28px)] pb-3 min-[760px]:flex-nowrap">
        {/* Orientation */}
        <div
          role="group"
          aria-label="Diagram orientation"
          className="flex flex-none rounded-[12px] border border-edge bg-panel p-[3px]"
        >
          {(["h", "v"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={orientation === o}
              onClick={() => setOrientation(o)}
              className={`cursor-pointer rounded-[9px] px-4 py-2 text-[13px] font-medium transition-colors min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                orientation === o
                  ? "bg-accent-bg text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {o === "h" ? "Horizontal" : "Vertical"}
            </button>
          ))}
        </div>

        {/* All notes */}
        <button
          type="button"
          role="switch"
          aria-checked={showAll}
          onClick={() => setShowAll((on) => !on)}
          title="Show every note on the neck, not just scale tones"
          className={`flex flex-none cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors min-[900px]:py-1.5 ${
            showAll
              ? "border-accent-edge bg-accent-bg text-accent"
              : "border-edge bg-panel text-ink-muted hover:text-ink"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full transition-colors ${
              showAll ? "bg-accent" : "bg-ink-ghost"
            }`}
          />
          All notes
        </button>

        {/* Extended frets */}
        <button
          type="button"
          role="switch"
          aria-checked={showExtended}
          onClick={() => setShowExtended((on) => !on)}
          title="Show frets 13–24, which repeat the same notes an octave higher"
          className={`flex flex-none cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors min-[900px]:py-1.5 ${
            showExtended
              ? "border-accent-edge bg-accent-bg text-accent"
              : "border-edge bg-panel text-ink-muted hover:text-ink"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full transition-colors ${
              showExtended ? "bg-accent" : "bg-ink-ghost"
            }`}
          />
          Frets 13–24
        </button>

        {/* Last of the four, and the only one that changes what is said
            rather than what is drawn. */}
        <button
          type="button"
          role="switch"
          aria-checked={pro}
          onClick={() => setPro((on) => !on)}
          title="Show what each note of the scale is doing"
          className={`flex flex-none cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors min-[900px]:py-1.5 ${
            pro
              ? "border-accent-edge bg-accent-bg text-accent"
              : "border-edge bg-panel text-ink-muted hover:text-ink"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full transition-colors ${
              pro ? "bg-accent" : "bg-ink-ghost"
            }`}
          />
          Pro
        </button>
      </div>

      {/*
        * Two columns above 900px, with the note always rendered so that
        * turning Pro on fills it rather than reflowing the neck under
        * someone reading it — the chord page's bargain, for the same
        * reason. Below that there is no beside, so the note hangs off the
        * bottom edge as a sheet you pull up.
        *
        * The neck keeps its minimal side padding in the single-column
        * layout: it is the widest thing on the page and the one that most
        * wants the room.
        */}
      <main className="note-stage mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-y-6 overflow-y-auto px-2 pb-[max(14px,env(safe-area-inset-bottom))] min-[560px]:px-4 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:items-start min-[900px]:gap-x-[clamp(1.5rem,4vw,3.5rem)] min-[900px]:px-[clamp(16px,4vw,40px)] min-[900px]:pt-2">
        <section className="min-w-0">
          {orientation === "h" ? (
            /* Horizontal: fixed-width SVG inside a scrolling container so the
               player scrolls with cursor/trackpad rather than seeing it squished */
            <div className="overflow-x-auto pb-1">
              <ScaleDiagram
                tonic={root}
                scale={scale}
                showAll={showAll}
                showExtended={showExtended}
                orientation="h"
              />
            </div>
          ) : (
            /* Vertical: narrow diagram, scrolls vertically when neck is long */
            <ScaleDiagram
              tonic={root}
              scale={scale}
              showAll={showAll}
              showExtended={showExtended}
              orientation="v"
            />
          )}
        </section>

        <NoteSheet open={noteUp} onOpenChange={setNoteUp} label={scaleTitle(root, scale)}>
          <ScaleInfoPane
            tonic={root}
            scale={scale}
            pitchClass={rootPitchClass}
            pro={pro}
          />
        </NoteSheet>
      </main>
    </div>
  );
}

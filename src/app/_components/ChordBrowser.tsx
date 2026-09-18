"use client";

/**
 * The chord library.
 *
 * A first draft covering the eight chords with a genuine open voicing. The
 * other roots keep their tabs but state plainly that they need a barre,
 * because an empty frame reads as breakage and a missing tab hides the
 * shape of what is coming.
 */

import { useState } from "react";

import { buildChord, rootFromPitchClass, rootName } from "@/core/music/chords.ts";
import { analyseShape } from "@/core/chords/analysis.ts";
import { findShape } from "@/core/chords/shapes.ts";
import { findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";

import { ChordDiagram, fingersUsed } from "./ChordDiagram";
import { HandLegend } from "./HandLegend";
import { Header } from "./Header";
import { InfoPane } from "./InfoPane";
import { ScaleRow } from "./ScaleRow";

/** Shapes are standard-tuning only in this draft, so the analysis is too. */
const STANDARD = resolveShape(findPreset("standard")!).strings;

const ROOTS = Array.from({ length: 12 }, (_, pitchClass) => ({
  pitchClass,
  name: rootName(rootFromPitchClass(pitchClass)),
}));

/** The toggle offers keys, so major and minor only — never diminished. */
const QUALITIES: ReadonlyArray<{ value: "major" | "minor"; label: string }> = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
];

export function ChordBrowser() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<"major" | "minor">("major");
  const [pro, setPro] = useState(false);

  const chord = buildChord(rootFromPitchClass(rootPitchClass), quality);
  const shape = findShape(rootPitchClass, quality);
  const analysis = shape ? analyseShape(shape, chord, STANDARD) : null;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* Roots scroll rather than wrap: twelve tabs do not fit a phone, and
          wrapping them onto two rows implies a grouping that is not real. */}
      <div className="mx-auto w-full max-w-[1120px] flex-none overflow-x-auto px-[clamp(16px,4vw,28px)] pb-2">
        <div
          role="tablist"
          aria-label="Chord root"
          className="flex w-max gap-1 rounded-[12px] border border-edge bg-panel p-[3px]"
        >
          {ROOTS.map((root) => {
            const selected = root.pitchClass === rootPitchClass;
            const available = findShape(root.pitchClass, quality) !== undefined;
            return (
              <button
                key={root.pitchClass}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setRootPitchClass(root.pitchClass)}
                className={`min-w-[42px] cursor-pointer rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors ${
                  selected
                    ? "bg-accent-bg text-accent"
                    : available
                      ? "text-ink hover:text-accent-bright"
                      : "text-ink-ghost"
                }`}
              >
                {root.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1120px] flex-none gap-[10px] px-[clamp(16px,4vw,28px)] pb-3">
        <div className="flex flex-none rounded-[12px] border border-edge bg-panel p-[3px]">
          {QUALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={quality === value}
              onClick={() => setQuality(value)}
              className={`cursor-pointer rounded-[9px] px-[18px] py-2 text-[13px] font-medium transition-colors ${
                quality === value ? "bg-accent-bg text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span className="truncate font-mono text-[13px] text-ink-muted">
            {chord.tones.map((tone) => rootName(tone.note)).join(" ")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={pro}
            onClick={() => setPro((on) => !on)}
            title="Show the notes you are holding and why"
            className={`flex flex-none cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
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
      </div>

      <ScaleRow
        tonic={rootFromPitchClass(rootPitchClass)}
        quality={quality}
      />

      {/*
        * Two columns, with the right one always present. Genius does this
        * with its annotations: reserving the space means turning Pro on
        * fills a pane rather than reflowing the page, and the diagram you
        * are reading never moves under your eyes. Below 900px there is no
        * room beside it, so the pane sits underneath — still always
        * rendered, for the same reason.
        */}
      <main className="mx-auto grid min-h-0 w-full max-w-[1120px] flex-1 grid-cols-1 items-stretch gap-x-10 gap-y-6 overflow-y-auto px-[clamp(16px,4vw,28px)] pb-[max(14px,env(safe-area-inset-bottom))] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <section className="flex flex-col items-center justify-center gap-5">
          <h1 className="flex-none text-[28px] leading-none font-bold tracking-tight min-[900px]:text-[40px]">
            {chord.symbol}
          </h1>

          {shape ? (
            <div className="flex w-full flex-col items-center gap-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-10">
              {/* On desktop the diagram grows and the hand sits beside it,
                  which is what the space was already there for. */}
              <div
                className="w-full max-w-[250px] flex-none min-[900px]:max-w-[320px]"
                style={{ aspectRatio: "248 / 250", maxHeight: "min(48vh, 360px)" }}
              >
                <ChordDiagram
                  shape={shape}
                  noteNames={
                    pro && analysis
                      ? analysis.strings.map((string) =>
                          string.note ? rootName(string.note) : null,
                        )
                      : undefined
                  }
                />
              </div>

              <HandLegend used={fingersUsed(shape)} />
            </div>
          ) : (
            <p className="max-w-[18rem] text-center text-[13px] text-ink-muted">
              {chord.symbol} is played as a barre chord, which this first draft
              does not cover yet. The eight open chords are C, D, E, G, A, Dm,
              Em and Am.
            </p>
          )}
        </section>

        <InfoPane chord={chord} analysis={analysis} pro={pro} />
      </main>
    </div>
  );
}

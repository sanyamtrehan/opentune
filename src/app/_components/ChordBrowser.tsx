"use client";

/**
 * The chord library.
 *
 * A first draft covering the eight chords with a genuine open voicing. The
 * other roots keep their tabs but state plainly that they need a barre,
 * because an empty frame reads as breakage and a missing tab hides the
 * shape of what is coming.
 */

import { useMemo, useState } from "react";

import { buildChord, respell, rootFromPitchClass, rootName } from "@/core/music/chords.ts";
import type { RootSpelling } from "@/core/music/chords.ts";
import { analyseShape } from "@/core/chords/analysis.ts";
import { positionsFor } from "@/core/chords/positions.ts";
import { findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";

import { ChordDiagram, fingersUsed } from "./ChordDiagram";
import { HandLegend } from "./HandLegend";
import { PositionSlider } from "./PositionSlider";
import { Header } from "./Header";
import { InfoPane } from "./InfoPane";
import { ScaleRow } from "./ScaleRow";

/** Shapes are standard-tuning only in this draft, so the analysis is too. */
const STANDARD = resolveShape(findPreset("standard")!).strings;

/**
 * How the roots are named. "Auto" is the mix guitarists actually use — E♭
 * and C♯ rather than D♯ and D♭ — because each key gets the name that needs
 * fewest accidentals. The other two answer someone who would rather have one
 * or the other throughout.
 */
const SPELLINGS: ReadonlyArray<{ value: RootSpelling; label: string; hint: string }> = [
  { value: "conventional", label: "Auto", hint: "The usual mix: E♭ but C♯" },
  { value: "sharp", label: "♯", hint: "Sharps throughout: E♭ becomes D♯" },
  { value: "flat", label: "♭", hint: "Flats throughout: C♯ becomes D♭" },
];

/** The toggle offers keys, so major and minor only — never diminished. */
const QUALITIES: ReadonlyArray<{ value: "major" | "minor"; label: string }> = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
];

export function ChordBrowser() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<"major" | "minor">("major");
  const [spelling, setSpelling] = useState<RootSpelling>("conventional");
  const [pro, setPro] = useState(false);
  const [chosenPosition, setChosenPosition] = useState(0);

  // Only the root's name is chosen; every other note follows from it by
  // letter-stepping, so the whole chord and the whole key change together.
  const root = rootFromPitchClass(rootPitchClass, 4, spelling);
  const chord = buildChord(root, quality);

  const positions = useMemo(
    () => positionsFor(rootPitchClass, quality, STANDARD),
    [quality, rootPitchClass],
  );
  // Clamped rather than reset: moving from a chord with four positions to
  // one with two should land on the last, not jump back to the first.
  const position = Math.min(chosenPosition, positions.length - 1);
  const shape = positions[position];
  const analysis = shape ? analyseShape(shape, chord, STANDARD) : null;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* Roots scroll rather than wrap: twelve tabs do not fit a phone, and
          wrapping them onto two rows implies a grouping that is not real. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center gap-3 px-[clamp(16px,4vw,28px)] pb-2">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div
            role="tablist"
            aria-label="Chord root"
            className="flex w-max gap-1 rounded-[12px] border border-edge bg-panel p-[3px]"
          >
            {Array.from({ length: 12 }, (_, pitchClass) => {
              const selected = pitchClass === rootPitchClass;
              return (
                <button
                  key={pitchClass}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setRootPitchClass(pitchClass)}
                  className={`min-w-[42px] cursor-pointer rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:min-w-[54px] min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                    selected
                      ? "bg-accent-bg text-accent"
                      : "text-ink hover:text-accent-bright"
                  }`}
                >
                  {rootName(rootFromPitchClass(pitchClass, 4, spelling))}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sits above the Pro switch, so the two display options are
            together and neither is mistaken for a chord control. */}
        <div
          role="group"
          aria-label="Note spelling"
          className="flex flex-none rounded-[12px] border border-edge bg-panel p-[3px]"
        >
          {SPELLINGS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              aria-pressed={spelling === value}
              title={hint}
              onClick={() => setSpelling(value)}
              className={`cursor-pointer rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                spelling === value
                  ? "bg-accent-bg text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-none gap-[10px] px-[clamp(16px,4vw,28px)] pb-3">
        <div className="flex flex-none rounded-[12px] border border-edge bg-panel p-[3px]">
          {QUALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={quality === value}
              onClick={() => setQuality(value)}
              className={`cursor-pointer rounded-[9px] px-[18px] py-2 text-[13px] font-medium transition-colors min-[900px]:px-6 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                quality === value ? "bg-accent-bg text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span className="truncate font-mono text-[13px] text-ink-muted">
            {chord.tones.map((tone) => rootName(respell(tone.note, spelling))).join(" ")}
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

      <ScaleRow tonic={root} quality={quality} spelling={spelling} chord={chord} />

      {/*
        * Two columns, with the right one always present. Genius does this
        * with its annotations: reserving the space means turning Pro on
        * fills a pane rather than reflowing the page, and the diagram you
        * are reading never moves under your eyes. Below 900px there is no
        * room beside it, so the pane sits underneath — still always
        * rendered, for the same reason.
        */}
      {/*
        * Safe centring, not plain `content-center`. Centred content that
        * overflows its container spills equally in both directions, and the
        * part above the top edge cannot be scrolled back to — which cut the
        * chord name in half on a short window. `safe` falls back to
        * top-aligned the moment it would not fit.
        *
        * The centring itself matters as much as the widths here. The grid used
        * to sit at the top of whatever height was left, which on a tall
        * screen put everything in the upper third with a dead half below.
        * Centring the tracks, and letting the diagram grow with the
        * viewport rather than stopping at a fixed pixel cap, is what
        * actually uses the space.
        */}
      <main className="mx-auto grid min-h-0 w-full max-w-[1240px] flex-1 pt-2 grid-cols-1 [align-content:safe_center] items-start gap-x-[clamp(1.5rem,4vw,3.5rem)] gap-y-8 overflow-y-auto px-[clamp(16px,4vw,40px)] pb-[max(14px,env(safe-area-inset-bottom))] min-[900px]:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex flex-col items-center justify-center gap-5">
          <h1 className="flex-none text-[28px] leading-none font-bold tracking-tight min-[900px]:text-[52px]">
            {chord.symbol}
          </h1>

          {shape && (
            <div className="flex w-full flex-col items-center gap-3">
              <PositionSlider
                count={positions.length}
                index={position}
                onChange={setChosenPosition}
                label={shape.name}
              >
              <div
                className="mx-auto w-full max-w-[260px] flex-none min-[900px]:max-w-[460px]"
                style={{ aspectRatio: "248 / 250", maxHeight: "min(56vh, 500px)" }}
              >
                <ChordDiagram
                  shape={shape}
                  noteNames={
                    pro && analysis
                      ? analysis.strings.map((string) =>
                          string.note
                            ? rootName(respell(string.note, spelling))
                            : null,
                        )
                      : undefined
                  }
                />
              </div>
              </PositionSlider>

              <div className="flex w-full max-w-[260px] items-end justify-between min-[900px]:max-w-[460px]">
                {/* Which of the positions is showing, and how to move between
                    them. Dots rather than a list: they say "there are more
                    of these" without naming any of them. */}
                <span className="text-[12px] text-ink-muted min-[900px]:text-[14px]">
                  {shape.name}
                  {positions.length > 1 && (
                    <span className="ml-2 text-ink-faint">drag to move</span>
                  )}
                </span>

                {/* Tucked into the corner rather than standing beside the
                    diagram: it is a key, not a second subject. */}
                <HandLegend used={fingersUsed(shape)} />
              </div>
            </div>
          )}
        </section>

        <InfoPane chord={chord} analysis={analysis} pro={pro} spelling={spelling} />
      </main>
    </div>
  );
}

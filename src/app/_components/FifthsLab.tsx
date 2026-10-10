"use client";

/**
 * Keys prototype — throwaway. Nothing in `core/` depends on it.
 *
 * The circle of fifths is the most reproduced graphic in guitar teaching
 * and almost all of it is a memorised poster. Two things make it worth
 * drawing here rather than printing:
 *
 *   1. This app already computes it. `scaleRoot` names a key by spelling
 *      it both ways and keeping whichever costs fewer accidentals, and the
 *      circle is nothing but those counts in order. The picture is of a
 *      rule in `core/music/scales.ts`, not of a convention.
 *   2. A poster cannot hand you the chord. Tapping a lit segment runs the
 *      existing voicing search and draws every way to play it.
 *
 * See `KeyCircle` for why the circle is built to look nothing like the
 * CAGED wheel.
 */

import { useState } from "react";

import { rootName } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import { diatonicChords, scaleRoot } from "@/core/music/scales.ts";
import { analyseShape } from "@/core/chords/analysis.ts";
import { positionsFor } from "@/core/chords/positions.ts";
import { findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";
import { ChordDiagram } from "./ChordDiagram";
import { FifthsInfoPane } from "./FifthsInfoPane";
import { Header } from "./Header";
import { KeyCircle, pitchClassAt } from "./KeyCircle";
import { NoteSheet } from "./NoteSheet";
import { ScrollRow } from "./ScrollRow";

const STANDARD = resolveShape(findPreset("standard")!).strings;

/** How many voicings to draw. Past three it stops being a page and becomes a list. */
const SHAPES_SHOWN = 3;

const tabClass = (selected: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
    selected ? "bg-accent-bg text-accent" : "text-ink hover:text-accent-bright"
  }`;

export function FifthsLab() {
  const [keyIndex, setKeyIndex] = useState(0);
  const [degree, setDegree] = useState(1);
  const [pro, setPro] = useState(false);
  const [noteUp, setNoteUp] = useState(false);

  const tonic = scaleRoot(pitchClassAt(keyIndex), "major");
  const chords = diatonicChords(tonic, "major");
  const chord = chords[degree - 1].chord;
  const rootPc = ((midiOf(chord.root) % 12) + 12) % 12;
  const shapes = positionsFor(rootPc, chord.quality, STANDARD).slice(0, SHAPES_SHOWN);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* The seven chords of the key. The circle shows six of them as a block;
          this row is where the seventh can still be reached. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Chord of the key">
          {chords.map((c, i) => (
            <button
              key={c.numeral}
              role="tab"
              type="button"
              aria-selected={i + 1 === degree}
              onClick={() => setDegree(i + 1)}
              className={`flex items-baseline gap-2 ${tabClass(i + 1 === degree)}`}
            >
              <span className="font-mono text-[11px] text-ink-faint">{c.numeral}</span>
              {c.chord.symbol}
            </button>
          ))}
        </ScrollRow>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center gap-2 px-[clamp(16px,4vw,28px)] pb-3">
        <p className="hidden min-w-0 flex-1 text-[12px] text-ink-faint min-[560px]:block min-[900px]:text-[13px]">
          Tap a lit segment for that chord; tap a dim one to change key.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={pro}
          onClick={() => setPro((on) => !on)}
          title="Explain the signature, the block, and what the next key costs"
          className={`flex flex-none cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-2 text-[12px] font-medium transition-colors min-[900px]:text-[13px] ${
            pro
              ? "border-accent-edge bg-accent-bg text-accent"
              : "border-edge bg-panel-raised text-ink-muted hover:text-ink"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${pro ? "bg-accent" : "bg-ink-ghost"}`}
          />
          Pro
        </button>
      </div>

      <main className="note-stage lab-stage mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-4 overflow-y-auto px-2 pb-[max(14px,env(safe-area-inset-bottom))] min-[560px]:px-4 min-[900px]:gap-6 min-[900px]:px-[clamp(16px,4vw,40px)] min-[900px]:pb-4">
        <div className="lab-panels grid flex-none items-start gap-4 min-[900px]:grid-cols-[340px_minmax(0,1fr)] min-[900px]:items-stretch min-[900px]:gap-6 min-[1200px]:grid-cols-[420px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[340px] min-[1200px]:max-w-[420px]">
            <KeyCircle
              keyIndex={keyIndex}
              chords={chords}
              degree={degree}
              onPickKey={(i) => {
                setKeyIndex(i);
                setDegree(1);
              }}
              onPickDegree={setDegree}
            />

            {/*
              * Says where the chosen chord sits. Mostly it names the lit
              * segment, but on vii° it has real work to do: nothing lights
              * up, and without a word here that reads as a broken diagram
              * rather than as the point being made.
              */}
            <p className="pt-1 text-center text-[12px] text-ink-muted min-[900px]:text-[13px]">
              {degree === 7 ? (
                <>
                  <span className="text-ink">{chord.symbol}</span> is the{" "}
                  {chords[6].numeral} — not on the circle at all.
                </>
              ) : (
                <>
                  <span className="text-ink">{chord.symbol}</span> is the{" "}
                  {chords[degree - 1].numeral} of {rootName(tonic)} major.
                </>
              )}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4 min-[900px]:h-full min-[900px]:min-h-0">
            {/* Every way to play the chosen chord — the thing a printed
                circle of fifths cannot do, and nearly free here because
                `positionsFor` already exists. */}
            <section className="no-scrollbar flex flex-none gap-3 overflow-x-auto pb-1">
              {shapes.map((shape) => (
                <figure
                  key={shape.id}
                  className="flex-none rounded-[14px] border border-edge bg-panel px-2 py-2"
                  style={{ width: 150 }}
                >
                  <figcaption className="label-caps pb-1 text-center">{shape.name}</figcaption>
                  <ChordDiagram
                    shape={shape}
                    noteNames={analyseShape(shape, chord, STANDARD).strings.map((s) =>
                      s.note ? rootName(s.note) : null,
                    )}
                  />
                </figure>
              ))}
            </section>

            <div className="lab-note min-w-0">
              <NoteSheet
                open={noteUp}
                onOpenChange={setNoteUp}
                label={`${rootName(tonic)} major · ${chord.symbol}`}
              >
                <FifthsInfoPane
                  keyIndex={keyIndex}
                  tonic={tonic}
                  chords={chords}
                  degree={degree}
                  pro={pro}
                />
              </NoteSheet>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

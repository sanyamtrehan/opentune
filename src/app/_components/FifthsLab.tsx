"use client";

/**
 * Keys prototype — throwaway. Nothing in `core/` depends on it.
 *
 * The circle of fifths is the most reproduced graphic in guitar teaching
 * and almost all of it is a memorised poster. Three things make it worth
 * drawing here rather than printing:
 *
 *   1. This app already computes it. `scaleRoot` names a key by spelling
 *      it both ways and keeping whichever costs fewer accidentals, and the
 *      circle is nothing but those counts in order.
 *   2. A poster cannot hand you the chord. Picking one runs the existing
 *      voicing search and draws every way to play it.
 *   3. A poster only ever shows major. Here the lit segments are derived
 *      from `diatonicChords`, so every scale in the browser can be put on
 *      it — and the ones that do not fit say so by falling apart, which is
 *      more honest and more interesting than leaving them out.
 *
 * Three pickers rather than two, because the first version had no way to
 * change key except by knowing that clicking a dim segment did it. The
 * circle still works that way as a shortcut, but it is no longer the only
 * route, and the caption under it offers the move explicitly.
 */

import { useState } from "react";

import { rootName } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import {
  SCALES,
  SCALE_NAMES,
  diatonicChords,
  parentMajor,
  scaleNotes,
  scaleRoot,
} from "@/core/music/scales.ts";
import type { ScaleName } from "@/core/music/scales.ts";
import { analyseShape } from "@/core/chords/analysis.ts";
import { positionsFor } from "@/core/chords/positions.ts";
import { findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";
import { ChordDiagram } from "./ChordDiagram";
import { FifthsInfoPane } from "./FifthsInfoPane";
import { Header } from "./Header";
import { KeyCircle } from "./KeyCircle";
import { NoteSheet } from "./NoteSheet";
import { ScrollRow } from "./ScrollRow";

const STANDARD = resolveShape(findPreset("standard")!).strings;

/** How many voicings to draw. Past three it stops being a page and becomes a list. */
const SHAPES_SHOWN = 3;

const tabClass = (selected: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
    selected ? "bg-accent-bg text-accent" : "text-ink hover:text-accent-bright"
  }`;

/**
 * The key signature a scale is written with.
 *
 * A mode borrows its parent major's. Harmonic and melodic minor are modes
 * of nothing, but they are written with the natural minor's signature and
 * their extra notes as accidentals in the bar — which is exactly what
 * falling back to `parentMajor(tonic, "minor")` says.
 */
function signatureKey(tonic: ReturnType<typeof scaleRoot>, scale: ScaleName) {
  return parentMajor(tonic, scale) ?? parentMajor(tonic, "minor")!;
}

export function FifthsLab() {
  const [tonicPitchClass, setTonicPitchClass] = useState(0);
  const [scale, setScale] = useState<ScaleName>("major");
  const [degree, setDegree] = useState(1);
  const [pro, setPro] = useState(false);
  const [noteUp, setNoteUp] = useState(false);

  const tonic = scaleRoot(tonicPitchClass, scale);
  const chords = diatonicChords(tonic, scale);
  const chord = chords[degree - 1].chord;
  const rootPc = ((midiOf(chord.root) % 12) + 12) % 12;
  const shapes = positionsFor(rootPc, chord.quality, STANDARD).slice(0, SHAPES_SHOWN);

  const signatureTonic = signatureKey(tonic, scale);
  const signatureNotes = scaleNotes(signatureTonic, "major");
  const sharps = signatureNotes.filter((n) => n.accidental > 0).length;
  const flats = signatureNotes.filter((n) => n.accidental < 0).length;
  const signature = sharps ? `${sharps} ♯` : flats ? `${flats} ♭` : "no ♯ or ♭";

  const pickKey = (pc: number, kind: "major" | "minor") => {
    setTonicPitchClass(pc);
    setScale(kind);
    setDegree(1);
  };

  /* Offered under the circle so that "this chord is also a key" is a thing
     you can do rather than a thing you have to already know. */
  const canModulate = degree !== 1 && (chord.quality === "major" || chord.quality === "minor");

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Key">
          {Array.from({ length: 12 }, (_, pc) => (
            <button
              key={pc}
              role="tab"
              type="button"
              aria-selected={pc === tonicPitchClass}
              onClick={() => {
                setTonicPitchClass(pc);
                setDegree(1);
              }}
              className={`min-w-[44px] min-[900px]:min-w-[54px] ${tabClass(pc === tonicPitchClass)}`}
            >
              {rootName(scaleRoot(pc, scale))}
            </button>
          ))}
        </ScrollRow>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Scale">
          {SCALE_NAMES.map((name) => (
            <button
              key={name}
              role="tab"
              type="button"
              aria-selected={name === scale}
              title={SCALES[name].hint}
              onClick={() => {
                setScale(name);
                setDegree(1);
              }}
              className={tabClass(name === scale)}
            >
              {SCALES[name].name}
            </button>
          ))}
        </ScrollRow>
      </div>

      {/* The seven chords. The circle seats most of them; this row is where
          the ones with no segment can still be reached. */}
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
          On the circle, a lit segment picks that chord; a dim one jumps to that major or minor key.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={pro}
          onClick={() => setPro((on) => !on)}
          title="Explain the signature, which chords are seated, and what the next key costs"
          className={`flex flex-none cursor-pointer items-center gap-2 min-[560px]:ml-auto rounded-[9px] border px-3 py-2 text-[12px] font-medium transition-colors min-[900px]:text-[13px] ${
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
              chords={chords}
              degree={degree}
              centreTitle={rootName(tonic)}
              centreSub={SCALES[scale].name.toUpperCase()}
              signature={signature}
              onPickDegree={setDegree}
              onPickKey={pickKey}
            />

            {/*
              * Says where the chosen chord sits. Mostly it names the lit
              * segment, but on a diminished or augmented chord it has real
              * work to do: nothing lights up, and without a word here that
              * reads as a broken diagram rather than as the point.
              */}
            <p className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 pt-1 text-center text-[12px] text-ink-muted min-[900px]:text-[13px]">
              <span>
                <span className="text-ink">{chord.symbol}</span> is the{" "}
                {chords[degree - 1].numeral} of {rootName(tonic)} {SCALES[scale].name.toLowerCase()}
                {chord.quality === "major" || chord.quality === "minor"
                  ? "."
                  : " — not on the circle at all."}
              </span>
              {canModulate && (
                <button
                  type="button"
                  onClick={() => pickKey(rootPc, chord.quality === "major" ? "major" : "minor")}
                  className="cursor-pointer rounded-full border border-edge bg-panel-raised px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:text-accent"
                >
                  Make {chord.symbol.replace(/m$/, "")} the key
                </button>
              )}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4 min-[900px]:h-full min-[900px]:min-h-0">
            <section className="no-scrollbar flex flex-none gap-3 overflow-x-auto pb-1">
              {/* No empty case: every diatonic chord of all nine scales in
                  all twelve keys has at least five positions on a
                  standard-tuned neck, diminished and augmented included —
                  `voicings.ts` searches the board rather than storing a
                  list, so the odd qualities are not a special case. */}
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
                label={`${rootName(tonic)} ${SCALES[scale].name} · ${chord.symbol}`}
              >
                <FifthsInfoPane
                  tonic={tonic}
                  scale={scale}
                  signatureTonic={signatureTonic}
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

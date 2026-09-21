"use client";

/**
 * The chord library.
 *
 * Twelve roots by eleven qualities, and every one of them has shapes. Two
 * rows of tabs rather than a dropdown for either: a player scanning for
 * "the one that goes m7" finds it faster in a row they can see all of than
 * in a list they have to open.
 */

import { useMemo, useState } from "react";

import {
  buildChord,
  keyQualityOf,
  respell,
  rootFromPitchClass,
  rootName,
} from "@/core/music/chords.ts";
import type { ChordQuality, RootSpelling } from "@/core/music/chords.ts";
import { analyseShape } from "@/core/chords/analysis.ts";
import { positionsFor } from "@/core/chords/positions.ts";
import { findPreset } from "@/core/tunings/presets.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";

import { BassPanel, BassPicker } from "./BassPicker";
import { ChordDiagram, fingersUsed } from "./ChordDiagram";
import { QualityPanel, QualityPicker } from "./QualityPicker";
import { ScrollRow } from "./ScrollRow";
import { HandLegend } from "./HandLegend";
import { PositionSlider } from "./PositionSlider";
import { Header } from "./Header";
import { InfoPane } from "./InfoPane";
import { NoteSheet } from "./NoteSheet";
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

export function ChordBrowser() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQuality>("major");
  const [bass, setBass] = useState<number | null>(null);
  const [spelling, setSpelling] = useState<RootSpelling>("conventional");
  const [pro, setPro] = useState(false);
  const [chosenPosition, setChosenPosition] = useState(0);
  // One at a time: two sheets hanging under the same row would overlap.
  const [panel, setPanel] = useState<"quality" | "bass" | null>(null);
  // Phone only: the note is pulled up over the page. Ignored above 900px,
  // where it is simply beside the diagram.
  const [noteUp, setNoteUp] = useState(false);

  // Only the root's name is chosen; every other note follows from it by
  // letter-stepping, so the whole chord and the whole key change together.
  const root = rootFromPitchClass(rootPitchClass, 4, spelling);
  const bassNote = bass === null ? null : rootFromPitchClass(bass, 3, spelling);
  const chord = buildChord(root, quality, bassNote);

  const positions = useMemo(
    () => positionsFor(rootPitchClass, quality, STANDARD, { bass }),
    [bass, quality, rootPitchClass],
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
          wrapping them onto two rows implies a grouping that is not real.
          They get the row to themselves — the display controls used to sit
          beside them and took two thirds of a phone's width, leaving five
          roots visible out of twelve. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Chord root">
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
                {rootName(rootFromPitchClass(pitchClass, 4, spelling))}
              </button>
            );
          })}
        </ScrollRow>
      </div>

      {/* The twenty common qualities scroll for the same reason the roots
          do, and the other thirty are one press away rather than on screen
          fighting them for attention.
          *
          * One wrapping row rather than two written out. The quality
          * scroller takes the whole width below 760px, which pushes the
          * display controls onto a line of their own; above it the
          * scroller is merely flexible and they all sit together. Same
          * markup, no duplicate set of controls hidden at one size. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none flex-wrap items-center gap-2 px-[clamp(16px,4vw,28px)] pb-3 min-[760px]:flex-nowrap min-[900px]:gap-3">
        <div className="flex min-w-0 flex-[1_1_100%] items-center gap-2 min-[760px]:flex-1 min-[900px]:gap-3">
          <QualityPicker
            quality={quality}
            onChange={setQuality}
            open={panel === "quality"}
            onOpenChange={(open) => setPanel(open ? "quality" : null)}
          />
        </div>

        <div className="flex flex-none items-center gap-2 min-[900px]:gap-3">
          {/* Spelling, bass and Pro: the three things that change how the
              chord is shown rather than which chord it is. */}
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
                className={`min-w-[38px] cursor-pointer rounded-[9px] px-2.5 py-2 text-[13px] font-medium transition-colors min-[900px]:min-w-0 min-[900px]:px-3 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                  spelling === value
                    ? "bg-accent-bg text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <BassPicker
            bass={bass}
            spelling={spelling}
            open={panel === "bass"}
            onOpenChange={(open) => setPanel(open ? "bass" : null)}
          />

          <button
            type="button"
            role="switch"
            aria-checked={pro}
            onClick={() => setPro((on) => !on)}
            title="Show the notes you are holding and why"
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
      </div>

      {panel === "quality" && (
        <QualityPanel
          quality={quality}
          onChange={setQuality}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "bass" && (
        <BassPanel
          bass={bass}
          onChange={setBass}
          spelling={spelling}
          onClose={() => setPanel(null)}
        />
      )}

      {/* The key a chord is read against. Most of these qualities are
          neither major nor minor on their own, so `keyQualityOf` decides —
          a 7th chord against the major key on its root, a m7 against the
          minor one. */}
      <ScaleRow
        tonic={root}
        quality={keyQualityOf(quality)}
        spelling={spelling}
        chord={chord}
      />

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
      {/*
        * Two layouts, not one that stretches. On a phone this is a flex
        * column where the diagram takes whatever height is left, so that
        * on any ordinary screen nothing scrolls: the note hangs off the
        * bottom edge instead of sitting below the fold. It can still
        * scroll, because a phone held sideways has 390px of height and no
        * layout fits a chord diagram into what is left of that — but
        * scrolling is the fallback rather than the plan.
        *
        * Above 900px it is the two-column grid, with the note beside the
        * diagram rather than hanging off the bottom of the screen.
        */}
      {/*
        * Safe centring on the wide layout, not plain `content-center`.
        * Centred content that overflows its container spills equally in
        * both directions, and the part above the top edge cannot be
        * scrolled back to — which cut the chord name in half on a short
        * window. `safe` falls back to top-aligned the moment it would not
        * fit.
        */}
      <main className="chord-stage mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-y-6 overflow-y-auto px-[clamp(16px,4vw,40px)] pb-[max(14px,env(safe-area-inset-bottom))] min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:[align-content:safe_center] min-[900px]:items-start min-[900px]:gap-x-[clamp(1.5rem,4vw,3.5rem)] min-[900px]:gap-y-8 min-[900px]:overflow-y-auto min-[900px]:pt-2 min-[900px]:pb-[max(14px,env(safe-area-inset-bottom))]">
        {/* No `min-h-0` on this column or the one inside it. That looks
            like the usual incantation for a shrinking flex child, and here
            it is the bug: it lets the column collapse past the diagram's
            own floor, whereupon the diagram overflows a zero-height box
            and the note paints straight over it. Leaving the minimum at
            `auto` means the column is never shorter than the diagram is
            allowed to be, and a screen too short for that scrolls. */}
        <section className="flex flex-1 flex-col items-center justify-center gap-3 min-[900px]:flex-none min-[900px]:gap-5">
          <h1 className="flex-none text-[28px] leading-none font-bold tracking-tight min-[900px]:text-[52px]">
            {chord.symbol}
          </h1>

          {shape && (
            <div className="flex w-full flex-1 flex-col items-center gap-3 min-[900px]:flex-none">
              <PositionSlider
                items={positions.map((candidate) => (
                  <div
                    key={candidate.id}
                    /* Height-driven on a phone, width-driven on a desk.
                       See the `.position-slider` rules in globals.css. */
                    className="mx-auto h-full w-auto max-w-full min-[900px]:h-auto min-[900px]:w-full min-[900px]:max-h-[min(52vh,500px)]"
                    style={{ aspectRatio: "276 / 250" }}
                  >
                    <ChordDiagram
                      shape={candidate}
                      noteNames={
                        pro
                          ? analyseShape(candidate, chord, STANDARD).strings.map(
                              (string) =>
                                string.note
                                  ? rootName(respell(string.note, spelling))
                                  : null,
                            )
                          : undefined
                      }
                    />
                  </div>
                ))}
                index={position}
                onChange={setChosenPosition}
                label={shape.name}
              />

              <div className="flex w-full items-end justify-between min-[900px]:max-w-[460px]">
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

        <NoteSheet open={noteUp} onOpenChange={setNoteUp} label={chord.symbol}>
          <InfoPane chord={chord} analysis={analysis} pro={pro} spelling={spelling} />
        </NoteSheet>
      </main>
    </div>
  );
}

"use client";

/**
 * CAGED prototype — throwaway. Nothing in `core/` depends on it.
 *
 * The question it exists to answer: does a wheel beside a neck actually
 * teach the cycle, or is it a decoration you look at once?
 *
 * The claim being tested is that CAGED is a coordinate system. Every major
 * chord has five shapes, and their barre frets sit at a fixed set of
 * offsets from one another — 0, 3, 5, 8, 10 — in every key without
 * exception. So the five wedges never move or change size; changing key
 * slides all five along the neck together, which on the wheel shows up as
 * the fret numbers changing while the letters stay put. One turn of the
 * wheel is twelve frets, which is why the C shape comes round again at the
 * 12th and the marker has to travel the whole rim to reach it.
 *
 * Two kinds of colour, kept strictly apart, because conflating them is how
 * this sort of diagram turns into a fruit salad:
 *
 *   Shape colour  — the wedge, and the segment on the rail above the board.
 *                   Identity: *which* box. Carried across both views, and
 *                   the only thread joining them.
 *   Dot colour    — amber root, blue chord tone, exactly as ScaleDiagram
 *                   and ChordDiagram already use them. Musical role.
 *
 * The rail is the second attempt at showing all six placements at once.
 * The first tinted the board itself for every one of them, and since
 * adjacent shapes overlap by design the tints stacked and the whole neck
 * went muddy brown. A rail says the same thing — here are the regions,
 * here is how they interlock — in a strip that cannot stack with itself.
 * Only the chosen shape is allowed to touch the board.
 *
 * Hardcoded to standard tuning and major triads: the prototype is about
 * whether the mapping reads, not about coverage.
 */

import { useState } from "react";

import { rootName } from "@/core/music/chords.ts";
import { midiOf, noteFromMidi } from "@/core/music/notes.ts";
import { scaleLeansFlat, scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";
import { CagedInfoPane } from "./CagedInfoPane";
import { Header } from "./Header";
import { NoteSheet } from "./NoteSheet";
import { ScrollRow } from "./ScrollRow";
import type { Placement } from "./caged-shapes";
import { FORMS, MUTED, OPEN_PC, degreeOf, placementsFor } from "./caged-shapes";

const FRET_COUNT = 15;

// ─── Neck geometry: ScaleDiagram's horizontal layout, plus a rail ─────────────

const H_NUT_X = 68;
const H_FRET_GAP = 56;
const H_TOP_PAD = 56;
const H_BOT_PAD = 28;
const H_STR_GAP = 36;
const H_DOT_R = 12;
const H_VIEW_H = H_TOP_PAD + 5 * H_STR_GAP + H_BOT_PAD;
const H_RENDERED_FRET_PX = 64;
const H_RAIL_Y = 22;
const H_RAIL_H = 9;
const H_RAIL_STEP = 11;

const INLAY_SINGLE = [3, 5, 7, 9, 15];
const INLAY_DOUBLE = [12];

const hsy = (i: number) => H_TOP_PAD + (5 - i) * H_STR_GAP;
const hfx = (fret: number) => (fret === 0 ? H_NUT_X - 24 : H_NUT_X + (fret - 0.5) * H_FRET_GAP);
const hedge = (fret: number) => H_NUT_X + fret * H_FRET_GAP;

// ─── Wheel geometry ───────────────────────────────────────────────────────────

const WC = 150;
const W_OUTER = 118;
const W_INNER = 68;
const W_TRACK = W_OUTER + 11;

/* Rounded, because an unrounded trig result serialises to a different last
   digit on the server than in the browser and React calls that a hydration
   mismatch. Two decimals is far below a pixel and ends the argument. */
const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r2(WC + r * Math.cos(a)), r2(WC + r * Math.sin(a))];
}

function wedgePath(a0: number, a1: number): string {
  const [x0, y0] = polar(W_INNER, a0);
  const [x1, y1] = polar(W_OUTER, a0);
  const [x2, y2] = polar(W_OUTER, a1);
  const [x3, y3] = polar(W_INNER, a1);
  return `M ${x0} ${y0} L ${x1} ${y1} A ${W_OUTER} ${W_OUTER} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${W_INNER} ${W_INNER} 0 0 0 ${x0} ${y0} Z`;
}

const tabClass = (selected: boolean) =>
  `cursor-pointer whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
    selected ? "bg-accent-bg text-accent" : "text-ink hover:text-accent-bright"
  }`;

const switchClass = (on: boolean) =>
  `flex flex-none cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors min-[900px]:text-[13px] ${
    on ? "border-accent-edge bg-accent-bg text-accent" : "border-edge bg-panel-raised text-ink-muted hover:text-ink"
  }`;

export function CagedLab() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [mode, setMode] = useState<"chord" | "scale">("scale");
  const [picked, setPicked] = useState(0);
  const [degrees, setDegrees] = useState(false);
  const [pro, setPro] = useState(false);
  const [noteUp, setNoteUp] = useState(false);

  // Spelling comes from core rather than a lookup table, so the E♭ chord
  // says E♭ and not D♯ — the whole reason notes are spelled in this codebase.
  const tonic = scaleRoot(rootPitchClass, "major");
  const scaleMap = new Map<number, Note>(
    scaleNotes(tonic, "major").map((n) => [((midiOf(n) % 12) + 12) % 12, n]),
  );
  const outsideSpelling = scaleLeansFlat(tonic, "major") ? "flat" : "sharp";
  const nameOf = (pc: number) =>
    rootName(scaleMap.get(pc) ?? noteFromMidi(60 + pc, outsideSpelling));

  const places = placementsFor(rootPitchClass, FRET_COUNT);
  const index = Math.min(picked, places.length - 1);
  const active = places[index];
  const tonicName = rootName(tonic);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* Chord root */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Chord root">
          {Array.from({ length: 12 }, (_, pc) => (
            <button
              key={pc}
              role="tab"
              type="button"
              aria-selected={pc === rootPitchClass}
              onClick={() => setRootPitchClass(pc)}
              className={`min-w-[44px] min-[900px]:min-w-[54px] ${tabClass(pc === rootPitchClass)}`}
            >
              {rootName(scaleRoot(pc, "major"))}
            </button>
          ))}
        </ScrollRow>
      </div>

      {/* Shapes, in neck order — so the C coming round again at the 12th is
          the last tab, rather than something you have to go looking for. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-2">
        <ScrollRow label="Shape">
          {places.map((p, i) => (
            <button
              key={`${p.form.letter}-${p.barre}`}
              role="tab"
              type="button"
              aria-selected={i === index}
              onClick={() => setPicked(i)}
              className={`flex items-center gap-2 ${tabClass(i === index)}`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: p.form.colour }}
              />
              {p.form.letter}
              <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                {p.barre === 0 ? "open" : p.barre}
              </span>
            </button>
          ))}
        </ScrollRow>
      </div>

      {/* Controls — one row that scrolls, rather than a row that wraps and
          leaves a lone switch stranded on a line of its own. */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none items-center px-[clamp(16px,4vw,28px)] pb-3">
        <ScrollRow label="What to show" role="group">
          {(["chord", "scale"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={tabClass(mode === m)}
            >
              {m === "chord" ? "Chord tones" : "Whole scale"}
            </button>
          ))}

          <span aria-hidden="true" className="mx-1 w-px flex-none self-stretch bg-edge" />

          {/* Drawn, not said. Kept apart from Pro because ScaleBrowser's Pro
              changes the words only, and the diagram must not move under
              someone who is reading it. */}
          <button
            type="button"
            role="switch"
            aria-checked={degrees}
            onClick={() => setDegrees((on) => !on)}
            title="Label the lit box R / 3 / 5 instead of note names"
            className={switchClass(degrees)}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${degrees ? "bg-accent" : "bg-ink-ghost"}`}
            />
            Degrees
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={pro}
            onClick={() => setPro((on) => !on)}
            title="Explain how the shape is built and where it joins its neighbours"
            className={switchClass(pro)}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${pro ? "bg-accent" : "bg-ink-ghost"}`}
            />
            Pro
          </button>
        </ScrollRow>
      </div>

      {/*
        * The neck gets a row to itself, full width. It is by a long way the
        * widest thing here, and when it shared a row with the wheel it was
        * clipped at the 11th fret — which hid the C shape returning at the
        * 12th, the one moment the whole prototype exists to show.
        */}
      <main className="note-stage mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-4 overflow-y-auto px-2 pb-[max(14px,env(safe-area-inset-bottom))] min-[560px]:px-4 min-[900px]:gap-6 lab-stage min-[900px]:px-[clamp(16px,4vw,40px)] min-[900px]:pb-4">
        <section className="no-scrollbar min-w-0 flex-none overflow-x-auto pb-1">
          <Neck
            rootPitchClass={rootPitchClass}
            mode={mode}
            degrees={degrees}
            places={places}
            active={active}
            scaleMap={scaleMap}
            nameOf={nameOf}
            onPick={(p) => setPicked(places.indexOf(p))}
          />
        </section>

        <div className="grid flex-none grid-cols-2 items-start gap-3 lab-panels min-[900px]:grid-cols-[300px_210px_minmax(0,1fr)] min-[900px]:gap-6">
          <Wheel
            rootPitchClass={rootPitchClass}
            tonicName={tonicName}
            places={places}
            active={active}
            onPick={(p) => setPicked(places.indexOf(p))}
          />
          <Grip active={active} tonicName={tonicName} nameOf={nameOf} />

          {/*
            * The note is the only thing here that can be any length, so it
            * is the only thing that scrolls. Letting the page scroll instead
            * meant reading the note took the neck and the wheel off the
            * screen — the same objection NoteSheet's own comment makes about
            * putting the note underneath on a phone.
            *
            * The padding is for the strip of tape, which sits above the
            * paper's own box and would otherwise be clipped by the scroller.
            *
            * Gated on height as well as width. A wide but short window has
            * no room for the neck, the wheel and a column of note all at
            * once, and freezing the page there just put the grip off the
            * bottom edge with no way to reach it. Short windows go back to
            * scrolling the page, which is ugly but never hides anything.
            */}
          <div className="lab-note min-w-0">
          <NoteSheet
            open={noteUp}
            onOpenChange={setNoteUp}
            label={`${tonicName} ${active.form.letter} shape`}
          >
            <CagedInfoPane
              places={places}
              active={active}
              tonicName={tonicName}
              rootPitchClass={rootPitchClass}
              nameOf={nameOf}
              pro={pro}
            />
          </NoteSheet>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Wheel ────────────────────────────────────────────────────────────────────

function Wheel({
  rootPitchClass,
  tonicName,
  places,
  active,
  onPick,
}: {
  rootPitchClass: number;
  tonicName: string;
  places: Placement[];
  active: Placement;
  onPick: (p: Placement) => void;
}) {
  /* Letting the angle exceed 360 is what makes the marker travel the whole
     rim into the second lap rather than snapping back to the top. */
  const marker = (active.form.cycle + active.form.width / 2) * 30 + 360 * active.lap;

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <svg
        viewBox="0 0 300 300"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`CAGED cycle for ${tonicName} major, ${active.form.letter} shape selected`}
      >
        {/* The rim the marker rides. Twelve ticks, because one turn is twelve frets. */}
        <circle cx={WC} cy={WC} r={W_TRACK} fill="none" stroke="var(--color-edge)" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => {
          const [x0, y0] = polar(W_TRACK - 4, i * 30);
          const [x1, y1] = polar(W_TRACK + 4, i * 30);
          return (
            <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-edge-strong)" strokeWidth="1.5" />
          );
        })}

        {FORMS.map((form) => {
          const a0 = form.cycle * 30;
          const a1 = (form.cycle + form.width) * 30;
          const mid = (a0 + a1) / 2;
          const on = form.letter === active.form.letter;
          const barre = (((rootPitchClass - form.anchor) % 12) + 12) % 12;
          const [lx, ly] = polar(W_INNER + 34, mid);
          const [fx, fy] = polar(W_INNER + 14, mid);
          const target = places.find((p) => p.form.letter === form.letter);

          return (
            <g key={form.letter} className="cursor-pointer" onClick={() => target && onPick(target)}>
              <path
                d={wedgePath(a0, a1)}
                fill={form.colour}
                fillOpacity={on ? 0.24 : 0.06}
                stroke={form.colour}
                strokeOpacity={on ? 0.85 : 0.2}
                strokeWidth={on ? 2 : 1}
              />
              <text
                x={lx}
                y={ly + 7}
                textAnchor="middle"
                fontSize="22"
                fontWeight="700"
                fill={form.colour}
                fillOpacity={on ? 1 : 0.5}
              >
                {form.letter}
              </text>
              {/* The only thing on this wheel that changes with the key. */}
              <text
                x={fx}
                y={fy + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="12"
                fill={on ? "var(--color-ink-muted)" : "var(--color-ink-ghost)"}
              >
                {barre === 0 ? "open" : barre}
              </text>
            </g>
          );
        })}

        {/* The marker rides the rim rather than sweeping from the centre: a
            needle crossed the letters and the fret numbers on its way past. */}
        <g
          style={{
            transform: `rotate(${marker}deg)`,
            transformOrigin: `${WC}px ${WC}px`,
            transition: "transform 520ms cubic-bezier(.22,.8,.3,1)",
          }}
        >
          <path
            d={`M ${WC} ${WC - W_TRACK + 7} l -7 -11 l 14 0 Z`}
            fill={active.form.colour}
          />
        </g>

        <text x={WC} y={WC - 2} textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--color-ink)">
          {tonicName}
        </text>
        <text x={WC} y={WC + 16} textAnchor="middle" fontSize="10" letterSpacing="0.18em" fill="var(--color-ink-faint)">
          MAJOR
        </text>
        {active.lap > 0 && (
          <text
            x={WC}
            y={WC + 34}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill={active.form.colour}
          >
            +12 · 2nd lap
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Chord grip ───────────────────────────────────────────────────────────────

/**
 * The run of strings the first finger lies across, if there is one.
 *
 * Only ever at the lowest fret of the shape, never at the nut, and only
 * where every string in between is actually played — otherwise it is two
 * fingers that happen to share a fret, which is a different hand.
 */
function barreOf(p: Placement): { from: number; to: number } | null {
  if (p.barre === 0) return null;
  const at = p.form.offsets
    .map((off, i) => ({ off, i }))
    .filter((x) => x.off === 0)
    .map((x) => x.i);
  if (at.length < 2) return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from; i <= to; i++) if (p.form.offsets[i] === MUTED) return null;
  return { from, to };
}

const G_COL = (i: number) => 24 + i * 26;
const G_ROW = (r: number) => 46 + r * 30;

function Grip({
  active,
  tonicName,
  nameOf,
}: {
  active: Placement;
  tonicName: string;
  nameOf: (pc: number) => string;
}) {
  const atNut = active.barre === 0;
  const rows = Math.max(4, atNut ? active.span : active.span + 1);
  const viewW = G_COL(5) + 24;
  const viewH = G_ROW(rows) + 14;
  const barre = barreOf(active);

  return (
    <div className="mx-auto w-full max-w-[210px] rounded-[14px] border border-edge bg-panel px-3 py-3">
      <div className="label-caps pb-1 text-center">
        {active.form.letter} shape · {atNut ? "open" : `fret ${active.barre}`}
      </div>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`${tonicName} major, ${active.form.letter} shape`}
      >
        {Array.from({ length: rows + 1 }, (_, r) => (
          <line
            key={r}
            x1={G_COL(0)}
            y1={G_ROW(r)}
            x2={G_COL(5)}
            y2={G_ROW(r)}
            stroke={r === 0 && atNut ? "var(--color-nut)" : "var(--color-fret)"}
            strokeWidth={r === 0 && atNut ? 5 : 1.5}
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={i}
            x1={G_COL(i)}
            y1={G_ROW(0)}
            x2={G_COL(i)}
            y2={G_ROW(rows)}
            stroke="var(--color-string)"
            strokeWidth={2.1 - i * 0.16}
          />
        ))}
        {!atNut && barre && (
          <rect
            x={G_COL(barre.from) - 9}
            y={G_ROW(0) + 6}
            width={G_COL(barre.to) - G_COL(barre.from) + 18}
            height="18"
            rx="9"
            fill="var(--color-accent)"
            fillOpacity="0.55"
          />
        )}
        {!atNut && (
          <text
            x={G_COL(0) - 14}
            y={G_ROW(0) + 20}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fill="var(--color-ink-faint)"
          >
            {active.barre}
          </text>
        )}

        {active.form.offsets.map((off, i) => {
          if (off === MUTED) {
            return (
              <text
                key={i}
                x={G_COL(i)}
                y={G_ROW(0) - 10}
                textAnchor="middle"
                fontSize="13"
                fill="var(--color-muted-string)"
              >
                ×
              </text>
            );
          }
          const pc = (OPEN_PC[i] + active.barre + off) % 12;
          const isRoot = nameOf(pc) === tonicName;
          const name = nameOf(pc);
          // Above the nut an offset of 0 is an open string, not a stopped
          // one — the row index has to allow for the nut occupying row 0.
          const row = atNut ? off - 1 : off;

          if (row < 0) {
            return (
              <g key={i}>
                <circle
                  cx={G_COL(i)}
                  cy={G_ROW(0) - 16}
                  r="9"
                  fill="var(--color-panel)"
                  stroke={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"}
                  strokeWidth="2"
                />
                <text
                  x={G_COL(i)}
                  y={G_ROW(0) - 12.5}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={name.length > 1 ? 8 : 9}
                  fill={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"}
                >
                  {name}
                </text>
              </g>
            );
          }

          return (
            <g key={i}>
              <circle
                cx={G_COL(i)}
                cy={G_ROW(row) + 15}
                r="10"
                fill={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"}
              />
              <text
                x={G_COL(i)}
                y={G_ROW(row) + 19}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={name.length > 1 ? 9 : 10}
                fontWeight="600"
                fill="var(--color-ground)"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Neck ─────────────────────────────────────────────────────────────────────

function Neck({
  rootPitchClass,
  mode,
  degrees,
  places,
  active,
  scaleMap,
  nameOf,
  onPick,
}: {
  rootPitchClass: number;
  mode: "chord" | "scale";
  degrees: boolean;
  places: Placement[];
  active: Placement;
  scaleMap: Map<number, Note>;
  nameOf: (pc: number) => string;
  onPick: (p: Placement) => void;
}) {
  const viewW = H_NUT_X + FRET_COUNT * H_FRET_GAP + 16;
  const renderedW = Math.round(viewW * (H_RENDERED_FRET_PX / H_FRET_GAP));
  const boardTop = H_TOP_PAD - 14;
  const boardH = 5 * H_STR_GAP + 28;
  const sideY = hsy(0) + 16;

  const bandX = (p: Placement): [number, number] => [
    p.barre === 0 ? H_NUT_X - 36 : hedge(p.barre - 1),
    hedge(p.barre + p.span),
  ];
  const inActive = (si: number, fret: number) => {
    const off = active.form.offsets[si];
    return off !== MUTED && fret === active.barre + off;
  };
  const [ax0, ax1] = bandX(active);

  return (
    <svg
      viewBox={`0 0 ${viewW} ${H_VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: `${renderedW}px`, height: "auto", display: "block" }}
      role="img"
      aria-label={`Neck, ${active.form.letter} shape at fret ${active.barre}`}
    >
      {/* Board */}
      <rect x={H_NUT_X} y={boardTop} width={FRET_COUNT * H_FRET_GAP} height={boardH} rx="6" fill="var(--color-board-face)" />

      {/* Only the chosen shape is allowed to tint the board. */}
      <rect
        x={ax0}
        y={boardTop}
        width={ax1 - ax0}
        height={boardH}
        rx="6"
        fill={active.form.colour}
        fillOpacity="0.15"
        stroke={active.form.colour}
        strokeOpacity="0.85"
        strokeWidth="2"
      />

      {/* Nut */}
      <rect x={H_NUT_X - 8} y={boardTop} width="9" height={boardH} rx="3" fill="var(--color-nut)" />

      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <line
          key={i}
          x1={hedge(i + 1)}
          y1={boardTop}
          x2={hedge(i + 1)}
          y2={boardTop + boardH}
          stroke="var(--color-fret)"
          strokeWidth="1.5"
        />
      ))}

      {(["E", "A", "D", "G", "B", "e"] as const).map((name, i) => (
        <text
          key={i}
          x={12}
          y={hsy(i) + 4}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {name}
        </text>
      ))}

      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <text
          key={i}
          x={hfx(i + 1)}
          y={14}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {i + 1}
        </text>
      ))}

      {/* The rail: every placement at once, in a strip that cannot stack
          with itself. Click a segment to go there. */}
      {places.map((p, i) => {
        const [x0, x1] = bandX(p);
        const on = p === active;
        /* Two rows, alternating. Neighbouring shapes overlap by design, and
           on one row those overlaps piled up into bright patches that read
           as a rendering fault. Staggered, the overlap is the thing you can
           see: where two bars pass each other is exactly where one box
           hands over to the next. */
        const y = H_RAIL_Y + (i % 2) * H_RAIL_STEP;
        return (
          <g key={`${p.form.letter}-${p.barre}`} className="cursor-pointer" onClick={() => onPick(p)}>
            <rect
              x={x0 + 2}
              y={y}
              width={x1 - x0 - 4}
              height={H_RAIL_H}
              rx={H_RAIL_H / 2}
              fill={p.form.colour}
              fillOpacity={on ? 1 : 0.4}
            />
            <text
              x={(x0 + x1) / 2}
              y={y + H_RAIL_H - 1.5}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="700"
              fill="var(--color-ground)"
              fillOpacity={on ? 1 : 0.8}
            >
              {p.form.letter}
            </text>
          </g>
        );
      })}

      {INLAY_SINGLE.filter((f) => f <= FRET_COUNT).map((fret) => (
        <circle key={fret} cx={hfx(fret)} cy={(hsy(2) + hsy(3)) / 2} r="4" fill="var(--color-fret)" opacity="0.45" />
      ))}
      {INLAY_DOUBLE.filter((f) => f <= FRET_COUNT).map((fret) => (
        <g key={fret}>
          <circle cx={hfx(fret)} cy={(hsy(4) + hsy(3)) / 2} r="4" fill="var(--color-fret)" opacity="0.45" />
          <circle cx={hfx(fret)} cy={(hsy(2) + hsy(1)) / 2} r="4" fill="var(--color-fret)" opacity="0.45" />
        </g>
      ))}
      {INLAY_SINGLE.filter((f) => f <= FRET_COUNT).map((fret) => (
        <circle key={fret} cx={hfx(fret)} cy={sideY} r="3" fill="var(--color-ink-ghost)" />
      ))}
      {INLAY_DOUBLE.filter((f) => f <= FRET_COUNT).map((fret) => (
        <g key={fret}>
          <circle cx={hfx(fret) - 7} cy={sideY} r="3" fill="var(--color-ink-ghost)" />
          <circle cx={hfx(fret) + 7} cy={sideY} r="3" fill="var(--color-ink-ghost)" />
        </g>
      ))}

      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={i}
          x1={H_NUT_X - 36}
          y1={hsy(i)}
          x2={hedge(FRET_COUNT)}
          y2={hsy(i)}
          stroke="var(--color-string)"
          strokeWidth={3.4 - (5 - i) * 0.32}
          strokeLinecap="round"
        />
      ))}

      {Array.from({ length: 6 }, (_, si) =>
        Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
          const pc = (OPEN_PC[si] + fret) % 12;
          const here = inActive(si, fret);
          const inScale = scaleMap.has(pc);
          if (!here && (mode === "chord" || !inScale)) return null;

          const cx = hfx(fret);
          const cy = hsy(si);
          const name = nameOf(pc);
          const isRoot = pc === rootPitchClass;
          // Only the lit box gets degrees: a degree is a claim about this
          // chord, and the notes outside it are not in this chord.
          const label = here && degrees ? degreeOf(pc, rootPitchClass) : name;

          if (!here) {
            return (
              <g key={`${si}-${fret}`} pointerEvents="none">
                <circle
                  cx={cx}
                  cy={cy}
                  r={H_DOT_R}
                  fill="var(--color-ground)"
                  fillOpacity="0.55"
                  stroke={isRoot ? "var(--color-finger-1)" : "var(--color-ink-ghost)"}
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={name.length > 1 ? 9 : 11}
                  fill="var(--color-ink-faint)"
                >
                  {name}
                </text>
              </g>
            );
          }

          return (
            <g key={`${si}-${fret}`} pointerEvents="none">
              <circle cx={cx} cy={cy} r={H_DOT_R} fill={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"} />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={label.length > 1 ? 9 : 11}
                fontWeight="600"
                fill="var(--color-ground)"
              >
                {label}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

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
 * 12th and the needle has to pass through a whole revolution to reach it.
 *
 * Two kinds of colour, kept strictly apart, because conflating them is how
 * this sort of diagram turns into a fruit salad:
 *
 *   Shape colour  — the wedge and the band on the neck. Identity: *which*
 *                   box this is. Carried across both views, and that is the
 *                   only thread joining them.
 *   Dot colour    — amber root, blue chord tone, exactly as ScaleDiagram
 *                   and ChordDiagram already use them. Musical role.
 *
 * Hardcoded to standard tuning and major triads: the prototype is about
 * whether the mapping reads, not about coverage.
 */

import { useState } from "react";

import { rootName } from "@/core/music/chords.ts";
import { midiOf, noteFromMidi } from "@/core/music/notes.ts";
import { scaleLeansFlat, scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";
import { Header } from "./Header";
import { ScrollRow } from "./ScrollRow";

const FRET_COUNT = 15;
const OPEN_PC = [4, 9, 2, 7, 11, 4]; // low E, A, D, G, B, high e
const MUTED = -1;

interface Form {
  letter: string;
  /** Wedge and band. Identity, not musical role. */
  colour: string;
  /** Frets above the barre, low string first — the nut's job done by a finger. */
  offsets: number[];
  /** Barre fret = (rootPitchClass - this) mod 12. */
  anchor: number;
  /** Semitones after the C shape's barre. Fixed in every key. */
  cycle: number;
  /** Wedge width in semitones — the gap to the next shape. */
  width: number;
}

const FORMS: readonly Form[] = [
  { letter: "C", colour: "var(--color-finger-1)", offsets: [MUTED, 3, 2, 0, 1, 0], anchor: 0, cycle: 0, width: 3 },
  { letter: "A", colour: "var(--color-finger-2)", offsets: [MUTED, 0, 2, 2, 2, 0], anchor: 9, cycle: 3, width: 2 },
  { letter: "G", colour: "var(--color-finger-3)", offsets: [3, 2, 0, 0, 0, 3], anchor: 7, cycle: 5, width: 3 },
  { letter: "E", colour: "var(--color-finger-4)", offsets: [0, 2, 2, 1, 0, 0], anchor: 4, cycle: 8, width: 2 },
  { letter: "D", colour: "var(--color-tuned)", offsets: [MUTED, MUTED, 0, 2, 3, 2], anchor: 2, cycle: 10, width: 2 },
];

interface Placement {
  form: Form;
  barre: number;
  /** 0 for the first time up the neck, 1 for the octave repeat. */
  lap: number;
  span: number;
}

function placementsFor(rootPc: number): Placement[] {
  const list: Placement[] = [];
  for (const form of FORMS) {
    const span = Math.max(...form.offsets.filter((o) => o !== MUTED));
    const base = (((rootPc - form.anchor) % 12) + 12) % 12;
    for (let lap = 0; lap < 2; lap++) {
      const barre = base + 12 * lap;
      if (barre + span <= FRET_COUNT) list.push({ form, barre, lap, span });
    }
  }
  return list.sort((a, b) => a.barre - b.barre || a.form.cycle - b.form.cycle);
}

// ─── Neck geometry: ScaleDiagram's horizontal layout, unchanged ───────────────

const H_NUT_X = 68;
const H_FRET_GAP = 56;
const H_TOP_PAD = 30;
const H_BOT_PAD = 28;
const H_STR_GAP = 36;
const H_DOT_R = 12;
const H_VIEW_H = H_TOP_PAD + 5 * H_STR_GAP + H_BOT_PAD;
const H_RENDERED_FRET_PX = 64;

const INLAY_SINGLE = [3, 5, 7, 9, 15];
const INLAY_DOUBLE = [12];

const hsy = (i: number) => H_TOP_PAD + (5 - i) * H_STR_GAP;
const hfx = (fret: number) => (fret === 0 ? H_NUT_X - 24 : H_NUT_X + (fret - 0.5) * H_FRET_GAP);
const hedge = (fret: number) => H_NUT_X + fret * H_FRET_GAP;

// ─── Wheel geometry ───────────────────────────────────────────────────────────

const WC = 160;
const W_OUTER = 132;
const W_INNER = 74;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [WC + r * Math.cos(a), WC + r * Math.sin(a)];
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

export function CagedLab() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [mode, setMode] = useState<"chord" | "scale">("scale");
  const [picked, setPicked] = useState(0);

  // Spelling comes from core rather than a lookup table, so the E♭ chord
  // says E♭ and not D♯ — the whole reason notes are spelled in this codebase.
  const tonic = scaleRoot(rootPitchClass, "major");
  const scaleMap = new Map<number, Note>(
    scaleNotes(tonic, "major").map((n) => [((midiOf(n) % 12) + 12) % 12, n]),
  );
  const outsideSpelling = scaleLeansFlat(tonic, "major") ? "flat" : "sharp";
  const nameOf = (pc: number) =>
    rootName(scaleMap.get(pc) ?? noteFromMidi(60 + pc, outsideSpelling));

  const places = placementsFor(rootPitchClass);
  const index = Math.min(picked, places.length - 1);
  const active = places[index];

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <Header />

      {/* Chord root tabs */}
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

      {/* Shape tabs — in neck order, so the wrap to the 12th fret is visible
          as the last tab rather than something you have to go looking for. */}
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

      <p className="mx-auto w-full max-w-[1240px] flex-none px-[clamp(16px,4vw,28px)] pb-2 text-[12px] text-ink-faint min-[900px]:text-[13px]">
        Five shapes, always in this order, always these gaps. Changing key slides all five
        along the neck together — on the wheel only the fret numbers move.
      </p>

      {/* Controls */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-none flex-wrap items-center gap-2 px-[clamp(16px,4vw,28px)] pb-3">
        <div
          role="group"
          aria-label="What to show on the neck"
          className="flex flex-none rounded-[12px] border border-edge bg-panel p-[3px]"
        >
          {(["chord", "scale"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`cursor-pointer rounded-[9px] px-4 py-2 text-[13px] font-medium transition-colors min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                mode === m ? "bg-accent-bg text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {m === "chord" ? "Chord tones" : "Whole scale"}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-y-6 overflow-y-auto px-2 pb-[max(14px,env(safe-area-inset-bottom))] min-[560px]:px-4 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_340px] min-[900px]:items-start min-[900px]:gap-x-[clamp(1.5rem,4vw,3.5rem)] min-[900px]:px-[clamp(16px,4vw,40px)] min-[900px]:pt-2">
        <section className="min-w-0">
          <div className="overflow-x-auto pb-1">
            <Neck
              rootPitchClass={rootPitchClass}
              mode={mode}
              places={places}
              active={active}
              scaleMap={scaleMap}
              nameOf={nameOf}
              onPick={(p) => setPicked(places.indexOf(p))}
            />
          </div>
        </section>

        <aside className="flex flex-col items-center gap-5 min-[900px]:items-stretch">
          <Wheel
            rootPitchClass={rootPitchClass}
            tonicName={rootName(tonic)}
            places={places}
            active={active}
            onPick={(p) => setPicked(places.indexOf(p))}
          />
          <Grip active={active} tonicName={rootName(tonic)} nameOf={nameOf} />
        </aside>
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
  // Letting the angle exceed 360 is what makes the needle sweep the whole way
  // round into the second lap rather than snapping back to the top.
  const needle = (active.form.cycle + active.form.width / 2) * 30 + 360 * active.lap;

  return (
    <svg
      viewBox="0 0 320 320"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "min(100%, 320px)", height: "auto", display: "block", margin: "0 auto" }}
      role="img"
      aria-label={`CAGED cycle for ${tonicName} major, ${active.form.letter} shape selected`}
    >
      {/* Twelve ticks, because one turn of this wheel is twelve frets. */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x0, y0] = polar(W_OUTER + 3, i * 30);
        const [x1, y1] = polar(W_OUTER + 10, i * 30);
        return (
          <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-edge-strong)" strokeWidth="2" />
        );
      })}

      {FORMS.map((form) => {
        const a0 = form.cycle * 30;
        const a1 = (form.cycle + form.width) * 30;
        const mid = (a0 + a1) / 2;
        const on = form.letter === active.form.letter;
        const barre = (((rootPitchClass - form.anchor) % 12) + 12) % 12;
        const [lx, ly] = polar((W_OUTER + W_INNER) / 2 + 13, mid);
        const [fx, fy] = polar((W_OUTER + W_INNER) / 2 - 19, mid);
        const target = places.find((p) => p.form.letter === form.letter);

        return (
          <g
            key={form.letter}
            className="cursor-pointer"
            onClick={() => target && onPick(target)}
          >
            <path
              d={wedgePath(a0, a1)}
              fill={form.colour}
              fillOpacity={on ? 0.26 : 0.06}
              stroke={form.colour}
              strokeOpacity={on ? 0.85 : 0.22}
              strokeWidth={on ? 2 : 1}
            />
            <text
              x={lx}
              y={ly + 7}
              textAnchor="middle"
              fontSize="21"
              fontWeight="700"
              fill={form.colour}
              fillOpacity={on ? 1 : 0.5}
            >
              {form.letter}
            </text>
            {/* The only thing on this wheel that changes with key. */}
            <text
              x={fx}
              y={fy + 4}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="11"
              fill={on ? "var(--color-ink-muted)" : "var(--color-ink-ghost)"}
            >
              {barre === 0 ? "open" : barre}
            </text>
          </g>
        );
      })}

      <g
        style={{
          transform: `rotate(${needle}deg)`,
          transformOrigin: "160px 160px",
          transition: "transform 520ms cubic-bezier(.22,.8,.3,1)",
        }}
      >
        <line
          x1={WC}
          y1={WC}
          x2={WC}
          y2={WC - W_OUTER - 4}
          stroke="var(--color-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={WC} cy={WC - W_OUTER - 4} r="4.5" fill="var(--color-ink)" />
      </g>
      <circle cx={WC} cy={WC} r="6" fill="var(--color-panel-raised)" stroke="var(--color-edge-strong)" strokeWidth="2" />

      <text x={WC} y={WC - 14} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-ink)">
        {tonicName}
      </text>
      <text x={WC} y={WC + 6} textAnchor="middle" fontSize="10" letterSpacing="0.18em" fill="var(--color-ink-faint)">
        MAJOR
      </text>
      {active.lap > 0 && (
        <text
          x={WC}
          y={WC + 28}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill={active.form.colour}
        >
          +12 · second lap
        </text>
      )}
    </svg>
  );
}

// ─── Chord grip ───────────────────────────────────────────────────────────────

function Grip({
  active,
  tonicName,
  nameOf,
}: {
  active: Placement;
  tonicName: string;
  nameOf: (pc: number) => string;
}) {
  const rows = Math.max(4, active.span + 1);
  const colX = (i: number) => 44 + i * 30;
  const rowY = (r: number) => 34 + r * 32;
  const viewH = rowY(rows) + 14;
  const atNut = active.barre === 0;

  return (
    <div className="mx-auto w-full max-w-[280px] rounded-[14px] border border-edge bg-panel px-3 py-3">
      <div className="label-caps pb-1 text-center">
        {tonicName} · {active.form.letter} shape · {atNut ? "open" : `fret ${active.barre}`}
      </div>
      <svg
        viewBox={`0 0 ${colX(5) + 44} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "min(100%, 230px)", height: "auto", display: "block", margin: "0 auto" }}
        role="img"
        aria-label={`${tonicName} major, ${active.form.letter} shape`}
      >
        {/* Fret lines, with a thick nut only where the shape really is at it. */}
        {Array.from({ length: rows + 1 }, (_, r) => (
          <line
            key={r}
            x1={colX(0)}
            y1={rowY(r)}
            x2={colX(5)}
            y2={rowY(r)}
            stroke={r === 0 && atNut ? "var(--color-nut)" : "var(--color-fret)"}
            strokeWidth={r === 0 && atNut ? 5 : 1.5}
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={i}
            x1={colX(i)}
            y1={rowY(0)}
            x2={colX(i)}
            y2={rowY(rows)}
            stroke="var(--color-string)"
            strokeWidth={2.2 - i * 0.18}
          />
        ))}
        {!atNut && (
          <text
            x={colX(0) - 18}
            y={rowY(0) + 24}
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
                x={colX(i)}
                y={rowY(0) - 8}
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
          return (
            <g key={i}>
              <circle
                cx={colX(i)}
                cy={rowY(off) - 16}
                r="11"
                fill={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"}
              />
              <text
                x={colX(i)}
                y={rowY(off) - 12}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={nameOf(pc).length > 1 ? 9 : 11}
                fontWeight="600"
                fill="var(--color-ground)"
              >
                {nameOf(pc)}
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
  places,
  active,
  scaleMap,
  nameOf,
  onPick,
}: {
  rootPitchClass: number;
  mode: "chord" | "scale";
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

      {/* Every placement gets a band, so the tiling is visible before you pick
          one. The faint ones are the point: the boxes interlock, they do not
          sit in isolation. */}
      {places.map((p) => {
        const [x0, x1] = bandX(p);
        const on = p === active;
        return (
          <rect
            key={`${p.form.letter}-${p.barre}`}
            x={x0}
            y={boardTop}
            width={x1 - x0}
            height={boardH}
            rx="6"
            fill={p.form.colour}
            fillOpacity={on ? 0.17 : 0.05}
            stroke={p.form.colour}
            strokeOpacity={on ? 0.8 : 0.18}
            strokeWidth={on ? 2 : 1}
            className="cursor-pointer"
            onClick={() => onPick(p)}
          />
        );
      })}

      {/* Nut */}
      <rect x={H_NUT_X - 8} y={boardTop} width="9" height={boardH} rx="3" fill="var(--color-nut)" />

      {/* Fret lines */}
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

      {/* String name labels */}
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

      {/* Fret numbers above the board */}
      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <text
          key={i}
          x={hfx(i + 1)}
          y={H_TOP_PAD - 16}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {i + 1}
        </text>
      ))}

      {/* Inlays */}
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

      {/* Strings — extend left of the nut for open-string dots */}
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

      {/* Note dots. Inside the lit box they are solid and read as the app's
          other diagrams read; outside they are rings, present but quiet. */}
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
              <circle
                cx={cx}
                cy={cy}
                r={H_DOT_R}
                fill={isRoot ? "var(--color-finger-1)" : "var(--color-accent)"}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={name.length > 1 ? 9 : 11}
                fontWeight="600"
                fill="var(--color-ground)"
              >
                {name}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

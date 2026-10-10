"use client";

/**
 * Guitar neck scale diagram, two orientations.
 *
 * Horizontal — headstock left, body right, strings run as horizontal lines
 * (high e top, low E bottom). Good for seeing position patterns across the
 * neck at a glance.
 *
 * Vertical — headstock top, body bottom, strings are vertical columns (low E
 * left, high e right), exactly like an extended chord box. Good for position
 * playing and reading alongside tab.
 *
 * Three dot categories:
 *   Root         → amber/orange (--color-finger-1)
 *   Scale tones  → accent blue
 *   Other notes  → outlined ring, shown only when showAll is true
 *
 * Side position markers (small dots at standard fret positions) sit below the
 * board in horizontal view and are implied by the fret numbers in vertical.
 */

import { midiOf, noteFromMidi } from "@/core/music/notes.ts";
import { rootName } from "@/core/music/chords.ts";
import { scaleLeansFlat, scaleNotes, scaleTitle } from "@/core/music/scales.ts";
import type { ScaleName } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";
import { findPreset } from "@/core/tunings/presets.ts";

const STANDARD = resolveShape(findPreset("standard")!).strings;

// Frets that carry an inlay on a real guitar neck.
const INLAY_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const INLAY_DOUBLE = [12, 24];

// ─── Horizontal layout ────────────────────────────────────────────────────────

const H_NUT_X = 68;
const H_FRET_GAP = 56;
const H_TOP_PAD = 30;
const H_BOT_PAD = 28;   // extra room for side position markers
const H_STR_GAP = 36;   // generous string spacing
const H_DOT_R = 12;
const H_VIEW_H = H_TOP_PAD + 5 * H_STR_GAP + H_BOT_PAD; // 238

// Rendered pixel width per fret — this fixes the diagram to a natural size
// so the browser scrolls it rather than squishing it to fit the container.
const H_RENDERED_FRET_PX = 64;

// y for string index i (0 = low E → bottom, 5 = high e → top)
function hsy(i: number): number {
  return H_TOP_PAD + (5 - i) * H_STR_GAP;
}

// x center for a note at a given fret (0 = open, to the left of the nut)
function hfx(fret: number): number {
  return fret === 0 ? H_NUT_X - 24 : H_NUT_X + (fret - 0.5) * H_FRET_GAP;
}

// ─── Vertical layout ──────────────────────────────────────────────────────────
// Uses the same STRING_X positions as ChordDiagram so it looks like an
// extended chord box.

const V_BOARD_X = 32;
const V_BOARD_PAD = 16;
const V_STR_X = [48, 84, 120, 156, 192, 228] as const; // low E → high e
const V_BOARD_W = V_STR_X[5] + V_BOARD_PAD - V_BOARD_X; // 212
const V_VIEW_W = V_BOARD_X + V_BOARD_W + 16; // 260  (same as ChordDiagram)
const V_NUM_X = 14;
const V_NUT_Y = 44;
const V_FRET_GAP = 40;
const V_DOT_R = 12;
const V_OPEN_Y = V_NUT_Y - 22; // open-string dot row, above the nut

function vfy(fret: number): number {
  return fret === 0 ? V_OPEN_Y : V_NUT_Y + (fret - 0.5) * V_FRET_GAP;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type NoteCategory = "root" | "scale" | "other";

export interface ScaleDiagramProps {
  tonic: Note;
  scale: ScaleName;
  showAll: boolean;
  showExtended: boolean;
  orientation: "h" | "v";
}

export function ScaleDiagram({
  tonic,
  scale,
  showAll,
  showExtended,
  orientation,
}: ScaleDiagramProps) {
  const fretCount = showExtended ? 24 : 12;

  const notes = scaleNotes(tonic, scale);
  const label = scaleTitle(tonic, scale);
  const tonicPc = ((midiOf(tonic) % 12) + 12) % 12;
  const scaleMap = new Map<number, Note>(
    notes.map((n) => [((midiOf(n) % 12) + 12) % 12, n]),
  );
  // Notes outside the scale have no spelling of their own to follow, so they
  // borrow the scale's direction. B♭ Phrygian should not show a D♯ sitting
  // next to its own D♭ on the same board.
  const outsideSpelling = scaleLeansFlat(tonic, scale) ? "flat" : "sharp";

  function categoryOf(pc: number): NoteCategory {
    if (pc === tonicPc) return "root";
    if (scaleMap.has(pc)) return "scale";
    return "other";
  }

  function nameOf(pc: number): string {
    const n = scaleMap.get(pc);
    if (n) return rootName(n);
    return rootName(noteFromMidi(60 + pc, outsideSpelling));
  }

  function dotFill(cat: NoteCategory): string {
    return cat === "root" ? "var(--color-finger-1)" : "var(--color-accent)";
  }

  // ─── Horizontal rendering ─────────────────────────────────────────────────

  if (orientation === "h") {
    const hViewW = H_NUT_X + fretCount * H_FRET_GAP + 16;
    // Pixel width the SVG renders at — fixed so the browser scrolls rather
    // than scaling the diagram down to fit.
    const hRenderedW = Math.round(hViewW * (H_RENDERED_FRET_PX / H_FRET_GAP));
    const hBoardTop = H_TOP_PAD - 14;
    const hBoardH = 5 * H_STR_GAP + 28;
    const sideY = hsy(0) + 16; // position-marker row, below low E string

    return (
      <svg
        viewBox={`0 0 ${hViewW} ${H_VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: `${hRenderedW}px`, height: "auto", display: "block" }}
        role="img"
        aria-label={`${label} scale, horizontal neck`}
      >
        {/* String name labels (E A D G B e) */}
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

        {/* Board */}
        <rect
          x={H_NUT_X}
          y={hBoardTop}
          width={fretCount * H_FRET_GAP}
          height={hBoardH}
          rx="6"
          fill="var(--color-board-face)"
        />

        {/* Nut */}
        <rect
          x={H_NUT_X - 8}
          y={hBoardTop}
          width={9}
          height={hBoardH}
          rx="3"
          fill="var(--color-nut)"
        />

        {/* Fret lines */}
        {Array.from({ length: fretCount }, (_, i) => (
          <line
            key={i}
            x1={H_NUT_X + (i + 1) * H_FRET_GAP}
            y1={hBoardTop}
            x2={H_NUT_X + (i + 1) * H_FRET_GAP}
            y2={hBoardTop + hBoardH}
            stroke="var(--color-fret)"
            strokeWidth="1.5"
          />
        ))}

        {/* Fret numbers above the board */}
        {Array.from({ length: fretCount }, (_, i) => (
          <text
            key={i}
            x={H_NUT_X + (i + 0.5) * H_FRET_GAP}
            y={H_TOP_PAD - 16}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fill="var(--color-ink-faint)"
          >
            {i + 1}
          </text>
        ))}

        {/* Fretboard inlay dots — between G and D strings */}
        {INLAY_SINGLE.filter((f) => f <= fretCount).map((fret) => (
          <circle
            key={fret}
            cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP}
            cy={(hsy(2) + hsy(3)) / 2}
            r={4}
            fill="var(--color-fret)"
            opacity="0.45"
          />
        ))}
        {INLAY_DOUBLE.filter((f) => f <= fretCount).map((fret) => (
          <g key={fret}>
            <circle
              cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP}
              cy={(hsy(4) + hsy(3)) / 2}
              r={4}
              fill="var(--color-fret)"
              opacity="0.45"
            />
            <circle
              cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP}
              cy={(hsy(2) + hsy(1)) / 2}
              r={4}
              fill="var(--color-fret)"
              opacity="0.45"
            />
          </g>
        ))}

        {/* Side position markers below the low-E string — single dot for
            3/5/7/9, two side-by-side for 12/24, mirroring the neck inlays */}
        {INLAY_SINGLE.filter((f) => f <= fretCount).map((fret) => (
          <circle
            key={fret}
            cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP}
            cy={sideY}
            r={3}
            fill="var(--color-ink-ghost)"
          />
        ))}
        {INLAY_DOUBLE.filter((f) => f <= fretCount).map((fret) => (
          <g key={fret}>
            <circle
              cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP - 7}
              cy={sideY}
              r={3}
              fill="var(--color-ink-ghost)"
            />
            <circle
              cx={H_NUT_X + (fret - 0.5) * H_FRET_GAP + 7}
              cy={sideY}
              r={3}
              fill="var(--color-ink-ghost)"
            />
          </g>
        ))}

        {/* Strings — extend left of the nut for open-string dots */}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={i}
            x1={H_NUT_X - 36}
            y1={hsy(i)}
            x2={H_NUT_X + fretCount * H_FRET_GAP}
            y2={hsy(i)}
            stroke="var(--color-string)"
            strokeWidth={3.4 - (5 - i) * 0.32}
            strokeLinecap="round"
          />
        ))}

        {/* Note dots */}
        {Array.from({ length: 6 }, (_, si) =>
          Array.from({ length: fretCount + 1 }, (_, fret) => {
            const midi = midiOf(STANDARD[si]) + fret;
            const pc = ((midi % 12) + 12) % 12;
            const cat = categoryOf(pc);
            if (cat === "other" && !showAll) return null;

            const cx = hfx(fret);
            const cy = hsy(si);
            const name = nameOf(pc);

            if (cat === "other") {
              return (
                <g key={`${si}-${fret}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={H_DOT_R}
                    fill="none"
                    stroke="var(--color-ink-ghost)"
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
              <g key={`${si}-${fret}`}>
                <circle cx={cx} cy={cy} r={H_DOT_R} fill={dotFill(cat)} />
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

  // ─── Vertical rendering ───────────────────────────────────────────────────

  const vViewH = V_NUT_Y + fretCount * V_FRET_GAP + 20;
  const vBoardTop = V_NUT_Y - 8;
  const vBoardH = fretCount * V_FRET_GAP + 10;

  return (
    <svg
      viewBox={`0 0 ${V_VIEW_W} ${vViewH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "min(100%, 300px)", height: "auto", display: "block", margin: "0 auto" }}
      role="img"
      aria-label={`${label} scale, vertical neck`}
    >
      {/* String name labels above the open-string row */}
      {(["E", "A", "D", "G", "B", "e"] as const).map((name, i) => (
        <text
          key={i}
          x={V_STR_X[i]}
          y={V_OPEN_Y - 14}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {name}
        </text>
      ))}

      {/* Board */}
      <rect
        x={V_BOARD_X}
        y={vBoardTop}
        width={V_BOARD_W}
        height={vBoardH}
        rx="6"
        fill="var(--color-board-face)"
      />

      {/* Nut */}
      <rect
        x={V_BOARD_X}
        y={V_NUT_Y - 8}
        width={V_BOARD_W}
        height={9}
        rx="3"
        fill="var(--color-nut)"
      />

      {/* Fret lines */}
      {Array.from({ length: fretCount }, (_, i) => (
        <line
          key={i}
          x1={V_BOARD_X}
          y1={V_NUT_Y + (i + 1) * V_FRET_GAP}
          x2={V_BOARD_X + V_BOARD_W}
          y2={V_NUT_Y + (i + 1) * V_FRET_GAP}
          stroke="var(--color-fret)"
          strokeWidth="1.5"
        />
      ))}

      {/* Fret numbers on the left */}
      {Array.from({ length: fretCount }, (_, i) => (
        <text
          key={i}
          x={V_NUM_X}
          y={V_NUT_Y + (i + 0.5) * V_FRET_GAP + 4}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {i + 1}
        </text>
      ))}

      {/* Fretboard inlay dots — between D and G strings */}
      {INLAY_SINGLE.filter((f) => f <= fretCount).map((fret) => (
        <circle
          key={fret}
          cx={(V_STR_X[2] + V_STR_X[3]) / 2}
          cy={V_NUT_Y + (fret - 0.5) * V_FRET_GAP}
          r={4}
          fill="var(--color-fret)"
          opacity="0.45"
        />
      ))}
      {INLAY_DOUBLE.filter((f) => f <= fretCount).map((fret) => (
        <g key={fret}>
          <circle
            cx={(V_STR_X[1] + V_STR_X[2]) / 2}
            cy={V_NUT_Y + (fret - 0.5) * V_FRET_GAP}
            r={4}
            fill="var(--color-fret)"
            opacity="0.45"
          />
          <circle
            cx={(V_STR_X[3] + V_STR_X[4]) / 2}
            cy={V_NUT_Y + (fret - 0.5) * V_FRET_GAP}
            r={4}
            fill="var(--color-fret)"
            opacity="0.45"
          />
        </g>
      ))}

      {/* Strings */}
      {V_STR_X.map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={V_NUT_Y}
          x2={x}
          y2={V_NUT_Y + fretCount * V_FRET_GAP}
          stroke="var(--color-string)"
          strokeWidth={3.4 - i * 0.32}
          strokeLinecap="round"
        />
      ))}

      {/* Note dots — frets 0 (open) through fretCount */}
      {Array.from({ length: 6 }, (_, si) =>
        Array.from({ length: fretCount + 1 }, (_, fret) => {
          const midi = midiOf(STANDARD[si]) + fret;
          const pc = ((midi % 12) + 12) % 12;
          const cat = categoryOf(pc);
          if (cat === "other" && !showAll) return null;

          const cx = V_STR_X[si];
          const cy = vfy(fret);
          const name = nameOf(pc);

          if (cat === "other") {
            return (
              <g key={`${si}-${fret}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={V_DOT_R}
                  fill="none"
                  stroke="var(--color-ink-ghost)"
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
            <g key={`${si}-${fret}`}>
              <circle cx={cx} cy={cy} r={V_DOT_R} fill={dotFill(cat)} />
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

"use client";

/**
 * The headstock: six pegs, three a side, laid out the way they sit on a real
 * 3+3 guitar — the innermost strings (D and G) take the pegs closest to the
 * nut. You tap the peg you are about to turn, which is the whole reason for
 * drawing a headstock rather than a list of buttons.
 *
 * The wood and the strings are one SVG; the pegs are real HTML buttons
 * positioned over it, so they are focusable, labelled and big enough to hit
 * with a thumb.
 */

import type { Note } from "@/core/music/types.ts";
import { formatNote } from "@/core/music/notes.ts";

/** Drawing space. Everything below is in these units, then scaled by CSS. */
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 430;

const NUT_Y = 372;
const PEG_ROWS = [96, 178, 260];
const POST_X = { left: 112, right: 188 };
const PEG_X = { left: 52, right: 248 };

/**
 * Which peg each string hangs from, low string first.
 *
 * Reading down the left side: 6th, 5th, 4th. Down the right side: 1st, 2nd,
 * 3rd — so the 4th and 3rd, the two middle strings, end up nearest the nut.
 */
const PEG_LAYOUT = [
  { side: "left", row: 0 },
  { side: "left", row: 1 },
  { side: "left", row: 2 },
  { side: "right", row: 2 },
  { side: "right", row: 1 },
  { side: "right", row: 0 },
] as const;

/** Where each string crosses the nut, low to high, left to right. */
function nutX(index: number): number {
  const spread = 74;
  return VIEW_WIDTH / 2 - spread / 2 + (spread / 5) * index;
}

function pegPoint(index: number) {
  const { side, row } = PEG_LAYOUT[index];
  return { x: PEG_X[side], y: PEG_ROWS[row], postX: POST_X[side], side };
}

export interface HeadstockProps {
  strings: Note[];
  /** Index of the string currently sounding, if any. */
  sounding: number | null;
  onPluck: (index: number) => void;
}

export function Headstock({ strings, sounding, onPluck }: HeadstockProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-[26rem]"
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a221d" />
            <stop offset="55%" stopColor="#1f1a17" />
            <stop offset="100%" stopColor="#171310" />
          </linearGradient>
        </defs>

        {/* Headstock body, tapering into the neck at the bottom. */}
        <path
          d="M 150 24
             C 196 24 222 40 224 76
             L 216 320
             C 214 348 200 362 182 366
             L 118 366
             C 100 362 86 348 84 320
             L 76 76
             C 78 40 104 24 150 24 Z"
          fill="url(#wood)"
          stroke="var(--color-wood-edge)"
          strokeWidth="1.5"
        />

        {/* Nut, then the neck disappearing off the bottom of the frame. */}
        <rect x="104" y={NUT_Y - 8} width="92" height="9" rx="3" fill="#d6d3d1" />
        <path
          d={`M 106 ${NUT_Y} L 194 ${NUT_Y} L 198 ${VIEW_HEIGHT} L 102 ${VIEW_HEIGHT} Z`}
          fill="#241d19"
        />

        {strings.map((note, index) => {
          const peg = pegPoint(index);
          const isSounding = index === sounding;
          return (
            <g key={index}>
              {/* String: over the nut, up the headstock, onto the post. */}
              <path
                d={`M ${nutX(index)} ${VIEW_HEIGHT}
                    L ${nutX(index)} ${NUT_Y - 6}
                    L ${peg.postX} ${peg.y}`}
                fill="none"
                stroke={isSounding ? "var(--color-accent)" : "var(--color-string)"}
                strokeWidth={isSounding ? 2.6 : 1.1 + (5 - index) * 0.34}
                strokeLinejoin="round"
                className="transition-[stroke,stroke-width] duration-200"
              />
              {/* Tuner post the string winds around. */}
              <circle
                cx={peg.postX}
                cy={peg.y}
                r="6.5"
                fill="#78716c"
                stroke="#44403c"
                strokeWidth="1"
              />
              <line
                x1={peg.postX}
                y1={peg.y}
                x2={peg.x + (peg.side === "left" ? 16 : -16)}
                y2={peg.y}
                stroke="#57534e"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {strings.map((note, index) => {
        const peg = pegPoint(index);
        const isSounding = index === sounding;
        const label = formatNote(note);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onPluck(index)}
            aria-pressed={isSounding}
            aria-label={`String ${6 - index}, ${label}. Play this pitch.`}
            className={[
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center",
              "rounded-full border font-mono tabular-nums transition-colors duration-150",
              "h-[16%] w-[22%] text-[clamp(0.8rem,3.4vw,1.05rem)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright",
              isSounding
                ? "peg-ringing border-accent bg-accent text-ground"
                : "border-edge bg-panel text-ink hover:border-accent-dim hover:text-accent-bright active:bg-edge",
            ].join(" ")}
            style={{
              left: `${(peg.x / VIEW_WIDTH) * 100}%`,
              top: `${(peg.y / VIEW_HEIGHT) * 100}%`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

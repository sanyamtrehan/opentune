"use client";

/**
 * The tuning stage: a dial across the top, a headstock below it, six pegs.
 *
 * One drawing, because it is one instrument. The needle pivots at the nut end
 * of the headstock, so the thing you are reading and the thing you are turning
 * occupy the same place on screen — you never have to look away from the pegs
 * to see how far off you are.
 *
 * The wood, strings and dial are SVG; the pegs are real HTML buttons
 * positioned over it, so they are focusable, labelled and big enough to hit
 * with a thumb. Geometry comes from docs/DESIGN.md.
 */

import { formatNote } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";

const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 540;

/** Where the needle turns, and how far it swings. */
const PIVOT = { x: 180, y: 130 };
const DEGREES_PER_CENT = 1.4;
const MAX_DEGREES = 70;

/**
 * Where each string's post sits, and where it crosses the nut. Low string
 * first: down the left side is 6th, 5th, 4th, and down the right is 1st, 2nd,
 * 3rd, so the outer strings take the posts nearest the nut. Getting this
 * wrong once already meant people turned the wrong peg.
 */
const GEOMETRY = [
  { side: "left", postY: 344, nutX: 136, gauge: 3.0 },
  { side: "left", postY: 272, nutX: 153, gauge: 2.6 },
  { side: "left", postY: 200, nutX: 170, gauge: 2.2 },
  { side: "right", postY: 200, nutX: 190, gauge: 1.8 },
  { side: "right", postY: 272, nutX: 207, gauge: 1.5 },
  { side: "right", postY: 344, nutX: 224, gauge: 1.2 },
] as const;

const POST_X = { left: 124, right: 236 };
const BAR_X = { left: 92, right: 242 };
const BUTTON_X = { left: 50, right: 310 };

const NUT_Y = 398;

export type StringState = "idle" | "active" | "tuned";

function stateOf(index: number, selected: number | null, tuned: readonly number[]) {
  if (tuned.includes(index)) return "tuned" as const;
  return index === selected ? ("active" as const) : ("idle" as const);
}

/** The line a string takes: post, over the nut, then off the bottom edge
 *  fanning outwards, the way strings actually run over a fretboard. */
function stringPath(index: number): string {
  const geometry = GEOMETRY[index];
  const postX = POST_X[geometry.side];
  const endX = 180 + (geometry.nutX - 180) * 1.18;
  return `M${postX} ${geometry.postY} L${geometry.nutX} ${NUT_Y} L${endX} ${VIEW_HEIGHT}`;
}

const STROKE: Record<StringState, string> = {
  idle: "var(--color-string)",
  active: "var(--color-accent)",
  tuned: "var(--color-tuned)",
};

export interface HeadstockProps {
  strings: Note[];
  /** The string being tuned, if one is chosen or detected. */
  selected: number | null;
  /** Strings that have been brought to pitch this session. */
  tuned: readonly number[];
  /** Deviation of the current reading, or null when nothing is being heard. */
  cents: number | null;
  /**
   * The most recent pluck. `nonce` changes on every play, including replays
   * of the same string, which is what lets the animation restart.
   */
  pluck?: { index: number; nonce: number } | null;
  onSelect: (index: number) => void;
}

export function Headstock({
  strings,
  selected,
  tuned,
  cents,
  pluck = null,
  onSelect,
}: HeadstockProps) {
  const angle =
    cents === null
      ? 0
      : Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, cents * DEGREES_PER_CENT));

  return (
    <div
      className="relative mx-auto h-full"
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ot-wood" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="var(--color-wood-light)" />
            <stop offset="45%" stopColor="var(--color-wood-mid)" />
            <stop offset="100%" stopColor="var(--color-wood-dark)" />
          </linearGradient>
          <linearGradient id="ot-board" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#241a12" />
            <stop offset="50%" stopColor="#31231816" />
            <stop offset="100%" stopColor="#1b120c" />
          </linearGradient>
          {/* The fretboard does not end, it leaves the frame. */}
          <linearGradient id="ot-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-ground)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-ground)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ot-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d8d8d8" />
            <stop offset="55%" stopColor="#8e8e8e" />
            <stop offset="100%" stopColor="#5c5c5c" />
          </linearGradient>
        </defs>

        {/* Dial. The green arc at the top is the in-tune zone: a target with
            width, rather than a line nobody can land on. */}
        <path
          d="M74.7 91.7 A112 112 0 0 1 285.3 91.7"
          fill="none"
          stroke="#1f1f1f"
          strokeWidth="2"
        />
        <path
          d="M166.3 18.8 A112 112 0 0 1 193.7 18.8"
          fill="none"
          stroke="#2c5943"
          strokeWidth="5"
        />
        <g stroke="#3c3c3c" strokeWidth="1.6">
          <line x1="87.2" y1="67.4" x2="100.4" y2="76.3" />
          <line x1="272.8" y1="67.4" x2="259.6" y2="76.3" />
          <line x1="127.4" y1="31.1" x2="134.9" y2="45.2" />
          <line x1="232.6" y1="31.1" x2="225.1" y2="45.2" />
          <line x1="152.9" y1="21.3" x2="156.8" y2="36.8" />
          <line x1="207.1" y1="21.3" x2="203.2" y2="36.8" />
        </g>
        <g stroke="#5a5a5a" strokeWidth="2.4">
          <line x1="74.7" y1="91.7" x2="89.8" y2="97.2" />
          <line x1="285.3" y1="91.7" x2="270.2" y2="97.2" />
          <line x1="105.1" y1="46.8" x2="115.8" y2="58.7" />
          <line x1="254.9" y1="46.8" x2="244.2" y2="58.7" />
        </g>
        <line x1="180" y1="18" x2="180" y2="36" stroke="#4c7c63" strokeWidth="2.4" />
        <text
          x="62"
          y="114"
          fill="var(--color-ink-muted)"
          fontFamily="var(--font-mono)"
          fontSize="13"
        >
          −50
        </text>
        <text
          x="270"
          y="114"
          fill="var(--color-ink-muted)"
          fontFamily="var(--font-mono)"
          fontSize="13"
        >
          +50
        </text>

        {/* Fretboard, running off the bottom edge under the fade. */}
        <path d="M118 540 L126 404 L234 404 L242 540 Z" fill="url(#ot-board)" />
        <g stroke="#4a4a4a" strokeWidth="2" opacity="0.65">
          <line x1="123" y1="452" x2="237" y2="452" />
          <line x1="121" y1="496" x2="239" y2="496" />
        </g>

        {/* Headstock body. */}
        <path
          d="M115 214 C115 158 138 126 180 126 C222 126 245 158 245 214 L243 384 C243 396 236 402 226 402 L134 402 C124 402 117 396 117 384 Z"
          fill="url(#ot-wood)"
        />
        <path
          d="M115 214 C115 158 138 126 180 126 C222 126 245 158 245 214 L243 384 C243 396 236 402 226 402 L134 402 C124 402 117 396 117 384 Z"
          fill="none"
          stroke="var(--color-wood-edge)"
          strokeWidth="1"
          opacity="0.5"
        />
        <path
          d="M140 150 C150 210 148 300 146 392"
          fill="none"
          stroke="#2a1d14"
          strokeWidth="2"
          opacity="0.5"
        />
        <path
          d="M212 148 C204 214 208 302 212 392"
          fill="none"
          stroke="#2a1d14"
          strokeWidth="2"
          opacity="0.45"
        />
        <rect x="122" y="396" width="116" height="11" rx="3.5" fill="var(--color-nut)" />

        {strings.map((note, index) => {
          const state = stateOf(index, selected, tuned);
          return (
            <path
              key={index}
              d={stringPath(index)}
              fill="none"
              stroke={STROKE[state]}
              strokeWidth={GEOMETRY[index].gauge + (state === "idle" ? 0 : 0.8)}
              strokeLinecap="round"
              opacity={state === "idle" ? 0.85 : 1}
              className="transition-[stroke,stroke-width,opacity] duration-200"
            />
          );
        })}

        {/* The pluck, as a copy of the string that blooms and dies. Keyed by
            the nonce so replaying the same string restarts the animation
            rather than being treated as no change. */}
        {pluck && (
          <path
            key={pluck.nonce}
            d={stringPath(pluck.index)}
            fill="none"
            stroke={STROKE[stateOf(pluck.index, selected, tuned)]}
            strokeLinecap="round"
            className="string-ring"
          />
        )}

        {GEOMETRY.map((geometry, index) => (
          <g key={index}>
            <rect
              x={BAR_X[geometry.side]}
              y={geometry.postY - 3.5}
              width="26"
              height="7"
              rx="3.5"
              fill="url(#ot-metal)"
            />
            <ellipse
              cx={POST_X[geometry.side]}
              cy={geometry.postY}
              rx="9"
              ry="9.5"
              fill="url(#ot-metal)"
              stroke="#4a4a4a"
              strokeWidth="1.2"
            />
            <circle
              cx={POST_X[geometry.side]}
              cy={geometry.postY}
              r="3.4"
              fill="#3a3a3a"
            />
          </g>
        ))}

        <rect x="104" y="454" width="152" height="86" fill="url(#ot-fade)" />

        {/* The needle, and the hub it turns on. */}
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
            transform: `rotate(${angle}deg)`,
            transition: "transform 90ms linear",
          }}
        >
          <line
            x1={PIVOT.x}
            y1={PIVOT.y}
            x2={PIVOT.x}
            y2="40"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={cents === null ? 0.35 : 1}
          />
          <circle
            cx={PIVOT.x}
            cy="42"
            r="4"
            fill="var(--color-accent)"
            opacity={cents === null ? 0.35 : 1}
          />
        </g>
        <circle
          cx={PIVOT.x}
          cy={PIVOT.y}
          r="11"
          fill="#120e09"
          stroke="#4a3a24"
          strokeWidth="2"
        />
        <circle cx={PIVOT.x} cy={PIVOT.y} r="3.5" fill="var(--color-accent)" />
      </svg>

      {strings.map((note, index) => {
        const geometry = GEOMETRY[index];
        const state = stateOf(index, selected, tuned);
        const label = formatNote(note);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-pressed={state !== "idle"}
            aria-label={`String ${6 - index}, ${label}${
              state === "tuned" ? ", in tune" : ""
            }`}
            className={[
              "absolute flex aspect-square w-[19.5%] min-w-[3.375rem] -translate-x-1/2 -translate-y-1/2",
              "cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full",
              "border-solid transition-[background-color,border-color,box-shadow,transform] duration-150",
              "active:scale-95",
              state === "tuned" ? "tuned-pop" : "",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright",
              state === "tuned"
                ? "border-[2.5px] border-tuned bg-tuned-bg text-tuned shadow-[0_0_22px_-6px_var(--color-tuned)]"
                : state === "active"
                  ? "border-[2.5px] border-accent bg-accent-bg text-accent shadow-[0_0_22px_-6px_var(--color-accent)]"
                  : "border-[1.5px] border-edge-strong bg-panel-raised text-[#c9c9c9] hover:border-accent-edge",
            ].join(" ")}
            style={{
              left: `${(BUTTON_X[geometry.side] / VIEW_WIDTH) * 100}%`,
              top: `${(geometry.postY / VIEW_HEIGHT) * 100}%`,
            }}
          >
            <span className="text-[clamp(0.875rem,2.2vh,1.25rem)] leading-none font-medium">
              {label}
            </span>
            <span className="font-mono text-[9px] leading-none tracking-[0.08em]">
              {state === "tuned" ? "TUNED" : state === "active" ? "ACTIVE" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

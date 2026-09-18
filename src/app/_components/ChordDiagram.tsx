"use client";

/**
 * A chord box: six strings, the nut, and a dot per fretted string.
 *
 * Laid out the way chord charts always are — strings vertical, low E on the
 * left, nut across the top. That is the opposite hand to the tuner's
 * headstock, which shows the instrument as you look down at it; this shows
 * it as a diagram, and matching the convention matters more than matching
 * the other screen.
 *
 * Dots are coloured by finger. Colour is never the only cue: each dot is
 * labelled for screen readers and the legend beside the diagram names them.
 */

import type { ChordShape, Finger } from "@/core/chords/shapes.ts";

const VIEW_WIDTH = 220;
const VIEW_HEIGHT = 250;

const STRING_X = [20, 56, 92, 128, 164, 200];
const NUT_Y = 44;
const FRET_GAP = 46;
const FRET_COUNT = 4;

export const FINGER_NAMES: Record<Exclude<Finger, null>, string> = {
  1: "Index",
  2: "Middle",
  3: "Ring",
  4: "Little",
};

export const FINGER_COLOURS: Record<Exclude<Finger, null>, string> = {
  1: "var(--color-finger-1)",
  2: "var(--color-finger-2)",
  3: "var(--color-finger-3)",
  4: "var(--color-finger-4)",
};

export interface ChordDiagramProps {
  shape: ChordShape;
  /** Optional note name under each string, for pro mode. */
  labels?: (string | null)[];
}

export function ChordDiagram({ shape, labels }: ChordDiagramProps) {
  const height = labels ? VIEW_HEIGHT + 34 : VIEW_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full max-h-full w-full"
      role="img"
      aria-label={shape.frets
        .map((fret, index) => {
          const string = 6 - index;
          if (fret === "muted") return `string ${string} muted`;
          if (fret === 0) return `string ${string} open`;
          return `string ${string} fret ${fret}, ${FINGER_NAMES[shape.fingers[index]!].toLowerCase()} finger`;
        })
        .join("; ")}
    >
      {/* Open and muted markers, above the nut. */}
      {shape.frets.map((fret, index) => {
        const x = STRING_X[index];
        if (fret === "muted") {
          return (
            <g key={index} stroke="var(--color-ink-faint)" strokeWidth="2.4" strokeLinecap="round">
              <line x1={x - 6} y1={20} x2={x + 6} y2={32} />
              <line x1={x + 6} y1={20} x2={x - 6} y2={32} />
            </g>
          );
        }
        if (fret === 0) {
          return (
            <circle
              key={index}
              cx={x}
              cy={26}
              r="6.5"
              fill="none"
              stroke="var(--color-ink-muted)"
              strokeWidth="2"
            />
          );
        }
        return null;
      })}

      {/* Nut: thick, because these are open shapes and it is the reference. */}
      <rect x={STRING_X[0]} y={NUT_Y - 5} width={STRING_X[5] - STRING_X[0]} height="6" rx="2" fill="var(--color-nut)" />

      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <line
          key={i}
          x1={STRING_X[0]}
          y1={NUT_Y + (i + 1) * FRET_GAP}
          x2={STRING_X[5]}
          y2={NUT_Y + (i + 1) * FRET_GAP}
          stroke="var(--color-edge-strong)"
          strokeWidth="2"
        />
      ))}

      {STRING_X.map((x, index) => (
        <line
          key={index}
          x1={x}
          y1={NUT_Y}
          x2={x}
          y2={NUT_Y + FRET_COUNT * FRET_GAP}
          stroke="#6b6660"
          // Wound strings are visibly thicker; low E on the left.
          strokeWidth={2.2 - index * 0.22}
        />
      ))}

      {shape.frets.map((fret, index) => {
        if (fret === "muted" || fret === 0) return null;
        const finger = shape.fingers[index]!;
        return (
          <circle
            key={index}
            cx={STRING_X[index]}
            cy={NUT_Y + (fret - 0.5) * FRET_GAP}
            r="14"
            fill={FINGER_COLOURS[finger]}
          />
        );
      })}

      {labels?.map((label, index) =>
        label === null ? null : (
          <text
            key={index}
            x={STRING_X[index]}
            y={NUT_Y + FRET_COUNT * FRET_GAP + 26}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="15"
            fill="var(--color-ink-muted)"
          >
            {label}
          </text>
        ),
      )}
    </svg>
  );
}

/** Which fingers a shape uses, in order, for the legend. */
export function fingersUsed(shape: ChordShape): Exclude<Finger, null>[] {
  const used = shape.fingers.filter((finger): finger is Exclude<Finger, null> => finger !== null);
  return [...new Set(used)].sort((a, b) => a - b);
}

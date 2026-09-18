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
 * Dots are coloured by finger and carry a label: the finger number normally,
 * the note name in pro mode. That makes the colour a reinforcement rather
 * than the only cue, which a legend of swatches never managed — you had to
 * translate swatch to word to finger, and the answer was already available
 * in the place you were looking.
 */

import type { ChordShape, Finger } from "@/core/chords/shapes.ts";

const VIEW_WIDTH = 220;
const VIEW_HEIGHT = 250;

const STRING_X = [20, 56, 92, 128, 164, 200];
const NUT_Y = 44;
const FRET_GAP = 46;
const FRET_COUNT = 4;

/** Open-string marker. Large enough to hold a note name inside it. */
const OPEN_RADIUS = 12;

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
  /**
   * Note name per string, low first, for pro mode. Each name goes inside the
   * marker for that string — the dot if it is fretted, the ring above the
   * nut if it is open.
   */
  noteNames?: (string | null)[];
}

export function ChordDiagram({ shape, noteNames }: ChordDiagramProps) {
  // Fixed height: the open-string names sit inside their own markers now, so
  // nothing about the geometry changes between modes and the diagram cannot
  // shift under someone reading it.
  const height = VIEW_HEIGHT;

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
          const name = noteNames?.[index];
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={26}
                r={OPEN_RADIUS}
                fill="none"
                stroke="var(--color-ink-muted)"
                strokeWidth="2"
              />
              {name && (
                <text
                  x={x}
                  y={31}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={name.length > 1 ? 11 : 13}
                  fill="var(--color-ink)"
                >
                  {name}
                </text>
              )}
            </g>
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
        const cy = NUT_Y + (fret - 0.5) * FRET_GAP;
        const label = noteNames?.[index] ?? String(finger);
        return (
          <g key={index}>
            <circle cx={STRING_X[index]} cy={cy} r="15" fill={FINGER_COLOURS[finger]} />
            <text
              x={STRING_X[index]}
              y={cy + 5}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={label.length > 1 ? 13 : 15}
              fontWeight="600"
              fill="var(--color-ground)"
            >
              {label}
            </text>
          </g>
        );
      })}

    </svg>
  );
}

/** Which fingers a shape uses, in order, for the legend. */
export function fingersUsed(shape: ChordShape): Exclude<Finger, null>[] {
  const used = shape.fingers.filter((finger): finger is Exclude<Finger, null> => finger !== null);
  return [...new Set(used)].sort((a, b) => a - b);
}

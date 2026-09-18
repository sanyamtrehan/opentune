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

/** Space under the diagram for open-string note names, always reserved. */
const LABEL_ROW = 34;

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
   * Note name per string, low first, for pro mode. Fretted strings show
   * theirs inside the dot; open strings have no dot, so theirs goes under
   * the diagram. Every sounding string is named exactly once.
   */
  noteNames?: (string | null)[];
}

export function ChordDiagram({ shape, noteNames }: ChordDiagramProps) {
  /*
   * The viewBox always reserves room for the open-string labels, even when
   * they are not drawn. Growing it in pro mode shrank the whole diagram to
   * fit the same box, so turning Pro on nudged the chord you were reading —
   * the shift this layout exists to avoid.
   */
  const height = VIEW_HEIGHT + LABEL_ROW;
  const showOpenLabels = noteNames !== undefined;

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

      {/* Open strings have no dot to write in, so they are named underneath. */}
      {showOpenLabels &&
        shape.frets.map((fret, index) =>
          fret === 0 && noteNames?.[index] ? (
            <text
              key={index}
              x={STRING_X[index]}
              y={NUT_Y + FRET_COUNT * FRET_GAP + 26}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="15"
              fill="var(--color-ink-muted)"
            >
              {noteNames[index]}
            </text>
          ) : null,
        )}
    </svg>
  );
}

/** Which fingers a shape uses, in order, for the legend. */
export function fingersUsed(shape: ChordShape): Exclude<Finger, null>[] {
  const used = shape.fingers.filter((finger): finger is Exclude<Finger, null> => finger !== null);
  return [...new Set(used)].sort((a, b) => a - b);
}

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

import { baseFret } from "@/core/chords/positions.ts";
import type { ChordShape, Finger } from "@/core/chords/shapes.ts";

const VIEW_WIDTH = 248;
const VIEW_HEIGHT = 250;

/** Room on the left for the fret numbers. */
const NUMBER_X = 14;

const STRING_X = [48, 84, 120, 156, 192, 228];
const NUT_Y = 44;
const FRET_GAP = 46;
const FRET_COUNT = 4;

/** The board extends past the outer strings, as a real fretboard does. */
const BOARD_PAD = 16;
const BOARD_X = STRING_X[0] - BOARD_PAD;
const BOARD_WIDTH = STRING_X[5] - STRING_X[0] + BOARD_PAD * 2;
const BOARD_HEIGHT = FRET_COUNT * FRET_GAP;

/** Open-string marker. Large enough to hold a note name inside it. */
const OPEN_RADIUS = 11;

/** Where the open/muted markers sit. Far enough above the nut to clear it —
 *  at 26 they touched the nut bar and read as part of the board. */
const MARKER_Y = 17;

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
  /*
   * Where the window onto the neck starts. Open shapes draw from the nut;
   * anything higher drops the nut, labels its top fret and draws four frets
   * from there — the alternative is a diagram the length of the neck.
   */
  const base = baseFret(shape);
  const atNut = base === 1;
  const rowFor = (fret: number) => NUT_Y + (fret - base + 0.5) * FRET_GAP;
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
            <g key={index} stroke="var(--color-muted-string)" strokeWidth="2.6" strokeLinecap="round">
              <line x1={x - 6} y1={MARKER_Y - 6} x2={x + 6} y2={MARKER_Y + 6} />
              <line x1={x + 6} y1={MARKER_Y - 6} x2={x - 6} y2={MARKER_Y + 6} />
            </g>
          );
        }
        if (fret === 0) {
          const name = noteNames?.[index];
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={MARKER_Y}
                r={OPEN_RADIUS}
                fill="none"
                stroke="var(--color-ink-muted)"
                strokeWidth="2"
              />
              {name && (
                <text
                  x={x}
                  y={MARKER_Y + 5}
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

      {/* The board itself. Without a surface the diagram is lines floating
          on the page; with one it reads as a piece of a fretboard. */}
      <rect
        x={BOARD_X}
        y={NUT_Y}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx="7"
        fill="var(--color-board-face)"
      />

      {/* The nut, when the shape reaches it. Higher up the neck there is no
          nut in view, just another fret. */}
      {atNut ? (
        <rect
          x={BOARD_X}
          y={NUT_Y - 7}
          width={BOARD_WIDTH}
          height="9"
          rx="3"
          fill="var(--color-nut)"
        />
      ) : (
        <line
          x1={BOARD_X}
          y1={NUT_Y}
          x2={BOARD_X + BOARD_WIDTH}
          y2={NUT_Y}
          stroke="var(--color-fret)"
          strokeWidth="2"
        />
      )}

      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <line
          key={i}
          x1={BOARD_X}
          y1={NUT_Y + (i + 1) * FRET_GAP}
          x2={BOARD_X + BOARD_WIDTH}
          y2={NUT_Y + (i + 1) * FRET_GAP}
          stroke="var(--color-fret)"
          strokeWidth="2"
        />
      ))}

      {/* Fret numbers. Every shape here starts at the nut, so they are
          always 1 to 4 — but a barre shape further up the neck will need
          them to say which frets these are, and the space is reserved now. */}
      {Array.from({ length: FRET_COUNT }, (_, i) => (
        <text
          key={i}
          x={NUMBER_X}
          y={NUT_Y + (i + 0.5) * FRET_GAP + 5}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="13"
          fill="var(--color-ink-faint)"
        >
          {base + i}
        </text>
      ))}

      {STRING_X.map((x, index) => (
        <line
          key={index}
          x1={x}
          y1={NUT_Y}
          x2={x}
          y2={NUT_Y + BOARD_HEIGHT}
          stroke="var(--color-string)"
          // Wound strings are visibly thicker; low E on the left.
          strokeWidth={3.4 - index * 0.32}
          strokeLinecap="round"
        />
      ))}

      {/* A muted string is marked down its whole length, not just with a
          cross above the nut — at a glance the red line is what tells you
          not to play it. */}
      {shape.frets.map((fret, index) =>
        fret === "muted" ? (
          <line
            key={index}
            x1={STRING_X[index]}
            y1={NUT_Y}
            x2={STRING_X[index]}
            y2={NUT_Y + BOARD_HEIGHT}
            stroke="var(--color-muted-string)"
            strokeWidth={3.4 - index * 0.32}
            strokeLinecap="round"
          />
        ) : null,
      )}

      {/* The barre: one finger laid flat, drawn as the bar it is rather than
          as a row of separate dots. */}
      {shape.barre && (
        <rect
          x={STRING_X[shape.barre.from] - 15}
          y={rowFor(shape.barre.fret) - 15}
          width={STRING_X[shape.barre.to] - STRING_X[shape.barre.from] + 30}
          height="30"
          rx="15"
          fill={FINGER_COLOURS[1]}
        />
      )}

      {/*
        * The notes the barre itself is holding.
        *
        * Those strings have no dot of their own to write in — the bar
        * replaced them — so without this the three or four notes under the
        * barre simply went unnamed, which is most of the chord on a barre
        * shape.
        */}
      {shape.barre &&
        noteNames &&
        shape.frets.map((fret, index) => {
          if (
            fret === "muted" ||
            fret !== shape.barre!.fret ||
            index < shape.barre!.from ||
            index > shape.barre!.to
          ) {
            return null;
          }
          const name = noteNames[index];
          if (!name) return null;
          return (
            <text
              key={`barre-${index}`}
              x={STRING_X[index]}
              y={rowFor(shape.barre!.fret) + 5}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={name.length > 1 ? 13 : 15}
              fontWeight="600"
              fill="var(--color-ground)"
            >
              {name}
            </text>
          );
        })}

      {shape.frets.map((fret, index) => {
        if (fret === "muted" || fret === 0) return null;
        const finger = shape.fingers[index]!;
        // Strings held down by the barre are already under the bar.
        if (
          shape.barre &&
          fret === shape.barre.fret &&
          index >= shape.barre.from &&
          index <= shape.barre.to
        ) {
          return null;
        }
        const cy = rowFor(fret);
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

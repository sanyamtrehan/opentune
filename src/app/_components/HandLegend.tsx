"use client";

/**
 * The finger colours, shown on a hand.
 *
 * A row of coloured dots beside the words "Index, Middle, Ring" makes you
 * translate twice — swatch to word, word to finger. A hand skips both: the
 * violet finger *is* the ring finger, in the position it occupies on your
 * hand.
 *
 * Drawn as the back of the fretting hand, which is the view a right-handed
 * player has of their own left hand over the neck: thumb on the left,
 * fingers running index to little across.
 *
 * The numbers stay. They restore the cue that colour alone cannot give a
 * colour-blind player, and they are the notation every chord book uses.
 */

import { FINGER_COLOURS, FINGER_NAMES } from "./ChordDiagram";
import type { Finger } from "@/core/chords/shapes.ts";

/** Each finger: x position, how far up it reaches, and its number. */
const FINGERS: ReadonlyArray<{ finger: Exclude<Finger, null>; x: number; top: number }> = [
  { finger: 1, x: 34, top: 26 },
  { finger: 2, x: 54, top: 16 },
  { finger: 3, x: 74, top: 22 },
  { finger: 4, x: 94, top: 38 },
];

const FINGER_WIDTH = 16;
const PALM_TOP = 74;

export interface HandLegendProps {
  /** Fingers this shape uses. Others are drawn dim. */
  used: ReadonlyArray<Exclude<Finger, null>>;
}

export function HandLegend({ used }: HandLegendProps) {
  return (
    <figure className="flex flex-none flex-col items-center gap-1.5">
      <svg
        viewBox="0 0 128 112"
        className="h-[84px] w-auto"
        role="img"
        aria-label={FINGERS.map(
          ({ finger }) =>
            `${FINGER_NAMES[finger]} finger is ${finger}${
              used.includes(finger) ? ", used in this chord" : ", not used"
            }`,
        ).join("; ")}
      >
        <rect
          x="28"
          y={PALM_TOP}
          width="82"
          height="32"
          rx="12"
          fill="var(--color-panel-raised)"
          stroke="var(--color-edge-strong)"
          strokeWidth="1.5"
        />

        {/* Thumb, angled off the side. Never coloured: it sits behind the
            neck and stops nothing in an open chord. */}
        <rect
          x="8"
          y="58"
          width="17"
          height="44"
          rx="8.5"
          transform="rotate(-28 16 80)"
          fill="var(--color-panel-raised)"
          stroke="var(--color-edge-strong)"
          strokeWidth="1.5"
        />

        {FINGERS.map(({ finger, x, top }) => {
          const active = used.includes(finger);
          return (
            <g key={finger}>
              <rect
                x={x}
                y={top}
                width={FINGER_WIDTH}
                height={PALM_TOP + 10 - top}
                rx={FINGER_WIDTH / 2}
                fill={active ? FINGER_COLOURS[finger] : "var(--color-panel-raised)"}
                stroke={active ? "none" : "var(--color-edge-strong)"}
                strokeWidth="1.5"
              />
              <text
                x={x + FINGER_WIDTH / 2}
                y={top + 17}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fontWeight="600"
                fill={active ? "var(--color-ground)" : "var(--color-ink-faint)"}
              >
                {finger}
              </text>
            </g>
          );
        })}

      </svg>
      <figcaption className="label-caps">fretting hand</figcaption>
    </figure>
  );
}

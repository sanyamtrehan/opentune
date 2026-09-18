"use client";

/**
 * Which finger is which colour, shown on a hand.
 *
 * The artwork is the supplied illustration, recoloured. Its fingers are not
 * separate paths, so they cannot be tinted directly — instead each finger's
 * colour is a plain shape clipped to the hand's own body. The clip does the
 * work: the tint stops exactly where the finger does, following the real
 * outline rather than a capsule pretending to be one.
 *
 * It is a left hand with the palm towards you, which is the fretting hand
 * seen from the front. So the fingers run little, ring, middle, index from
 * left to right, and the thumb is on the right.
 */

import { FINGER_COLOURS, FINGER_NAMES } from "./ChordDiagram";
import { HAND_BODY, HAND_SHADOW } from "./hand-paths";
import type { Finger } from "@/core/chords/shapes.ts";

/** The artwork's own coordinate space. */
const VIEW_WIDTH = 178.012;
const VIEW_HEIGHT = 281.509;

/** Where the knuckles are: colour runs from the fingertip down to here. */
const KNUCKLE_Y = 116;

/**
 * Each finger's column in the artwork, measured off the rendered drawing.
 * Generous enough to cover the finger's full width — the clip trims the rest.
 */
const FINGERS: ReadonlyArray<{
  finger: Exclude<Finger, null>;
  x: number;
  width: number;
  top: number;
  /** Where the number sits, near the tip. */
  label: { x: number; y: number };
}> = [
  { finger: 4, x: 2, width: 34, top: 42, label: { x: 20, y: 84 } },
  { finger: 3, x: 33, width: 34, top: 14, label: { x: 51, y: 58 } },
  { finger: 2, x: 69, width: 36, top: -2, label: { x: 88, y: 44 } },
  { finger: 1, x: 105, width: 34, top: 16, label: { x: 122, y: 60 } },
];

export interface HandLegendProps {
  /** Fingers this shape uses. The rest stay neutral. */
  used: ReadonlyArray<Exclude<Finger, null>>;
}

export function HandLegend({ used }: HandLegendProps) {
  return (
    <figure className="flex flex-none flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-[150px] w-auto min-[900px]:h-[200px]"
        role="img"
        aria-label={FINGERS.map(
          ({ finger }) =>
            `${FINGER_NAMES[finger]} finger is number ${finger}${
              used.includes(finger) ? ", used in this chord" : ", not used"
            }`,
        ).join("; ")}
      >
        <defs>
          <clipPath id="ot-hand-body">
            <path d={HAND_BODY} />
          </clipPath>
        </defs>

        <path d={HAND_SHADOW} fill="var(--color-edge-strong)" />
        <path d={HAND_BODY} fill="var(--color-panel-raised)" />

        <g clipPath="url(#ot-hand-body)">
          {FINGERS.filter(({ finger }) => used.includes(finger)).map(
            ({ finger, x, width, top }) => (
              // Curved along the bottom rather than square: the knuckles are
              // not a straight line across the hand, and a flat edge there
              // reads as the colour being cut off rather than ending.
              <path
                key={finger}
                d={[
                  `M ${x} ${top}`,
                  `L ${x + width} ${top}`,
                  `L ${x + width} ${KNUCKLE_Y - 4}`,
                  `Q ${x + width / 2} ${KNUCKLE_Y + 9} ${x} ${KNUCKLE_Y - 4}`,
                  "Z",
                ].join(" ")}
                fill={FINGER_COLOURS[finger]}
              />
            ),
          )}
        </g>

        {FINGERS.map(({ finger, label }) => {
          const active = used.includes(finger);
          return (
            <text
              key={finger}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="16"
              fontWeight="600"
              fill={active ? "var(--color-ground)" : "var(--color-ink-faint)"}
            >
              {finger}
            </text>
          );
        })}
      </svg>
      <figcaption className="label-caps">fretting hand</figcaption>
    </figure>
  );
}

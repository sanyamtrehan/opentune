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
 * The artwork is mirrored. As drawn it is a left hand seen palm-on, which
 * puts the little finger on the left — the opposite order to the chord
 * diagram beside it, where the low string is on the left. Flipping it lines
 * the two up, so index is on the same side in both.
 *
 * No numbers on the fingers: the dots in the diagram already carry them, and
 * repeating them here made the hand look like a second control.
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
 * One wedge per finger, following how the fingers splay.
 *
 * Straight vertical columns do not work: the fingers fan outwards, so a box
 * wide enough to cover the ring finger at its tip also overlaps the little
 * finger lower down, and the colour bleeds from one to the next. Each wedge
 * is narrower at the knuckle and tracks its own finger's angle, and is
 * intersected with the hand body so it can only ever paint inside the
 * silhouette.
 */
const FINGERS: ReadonlyArray<{
  finger: Exclude<Finger, null>;
  /** Tip corners then knuckle corners, clockwise. */
  wedge: [number, number][];
}> = [
  {
    finger: 4,
    wedge: [
      [4, 38],
      [35, 38],
      [37, KNUCKLE_Y],
      [10, KNUCKLE_Y],
    ],
  },
  {
    finger: 3,
    wedge: [
      [38, 10],
      [65, 10],
      [63, KNUCKLE_Y],
      [39, KNUCKLE_Y],
    ],
  },
  {
    finger: 2,
    wedge: [
      [70, -6],
      [101, -6],
      [92, KNUCKLE_Y],
      [66, KNUCKLE_Y],
    ],
  },
  {
    finger: 1,
    wedge: [
      [104, 8],
      [136, 8],
      [126, KNUCKLE_Y],
      [95, KNUCKLE_Y],
    ],
  },
];

function wedgePath(points: [number, number][], bottom: number): string {
  const [tipLeft, tipRight, baseRight, baseLeft] = points;
  return [
    `M ${tipLeft[0]} ${tipLeft[1]}`,
    `L ${tipRight[0]} ${tipRight[1]}`,
    `L ${baseRight[0]} ${baseRight[1] - 4}`,
    // Curved along the bottom: knuckles are not a straight line across, and
    // a flat edge reads as the colour being cut off rather than ending.
    `Q ${(baseLeft[0] + baseRight[0]) / 2} ${bottom + 9} ${baseLeft[0]} ${baseLeft[1] - 4}`,
    "Z",
  ].join(" ");
}

export interface HandLegendProps {
  /** Fingers this shape uses. The rest stay neutral. */
  used: ReadonlyArray<Exclude<Finger, null>>;
}

export function HandLegend({ used }: HandLegendProps) {
  return (
    <figure className="flex flex-none flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-[76px] w-auto min-[900px]:h-[96px]"
        role="img"
        aria-label={FINGERS.map(
          ({ finger }) =>
            `${FINGER_NAMES[finger]} finger is number ${finger}${
              used.includes(finger) ? ", used in this chord" : ", not used"
            }`,
        ).join("; ")}
      >
        {/* Mirrored, so the fingers run the same way as the strings do. */}
        <g transform={`translate(${VIEW_WIDTH} 0) scale(-1 1)`}>
        <defs>
          <clipPath id="ot-hand-body">
            <path d={HAND_BODY} />
          </clipPath>
        </defs>

        <path d={HAND_SHADOW} fill="var(--color-edge-strong)" />
        <path d={HAND_BODY} fill="var(--color-panel-raised)" />

        <g clipPath="url(#ot-hand-body)">
          {FINGERS.filter(({ finger }) => used.includes(finger)).map(
            ({ finger, wedge }) => (
              <path
                key={finger}
                d={wedgePath(wedge, KNUCKLE_Y)}
                fill={FINGER_COLOURS[finger]}
              />
            ),
          )}
        </g>
        </g>
      </svg>
      <figcaption className="label-caps">fingers</figcaption>
    </figure>
  );
}

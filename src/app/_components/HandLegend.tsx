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

/**
 * One shape per finger, traced against the artwork.
 *
 * Straight vertical columns do not work: the fingers fan outwards, so a box
 * wide enough to cover the ring finger at its tip also overlaps the little
 * finger lower down, and the colour bleeds from one to the next. Each shape
 * follows its own finger's angle instead, and is intersected with the hand
 * body so it can only ever paint inside the silhouette — the tint stops
 * exactly where the finger does, following the real outline rather than a
 * capsule pretending to be one.
 *
 * These used to be generated: four corners per finger and a function that
 * built the path, with a shared knuckle line and a curve bowed a fixed
 * distance below it. That was tidy and slightly wrong everywhere, because
 * the fingers on this particular drawing are not a tidy family — they start
 * at different heights, lean at different angles, and the middle finger is
 * much wider at the tip than the formula would allow. So they are now
 * written out, each one adjusted against the drawing until it fitted.
 *
 * Coordinates are the artwork's own, before the mirror below.
 */
const FINGERS: ReadonlyArray<{
  finger: Exclude<Finger, null>;
  path: string;
}> = [
  { finger: 4, path: "M -1 42 L 40 41 L 46 121 Q 28.5 138 7 120 Z" },
  { finger: 3, path: "M 29 15 L 70 17 L 72 113 Q 57 130 39 112 Z" },
  { finger: 2, path: "M 70 -1 L 156 7 L 96 114 Q 82 122 74 111 Z" },
  { finger: 1, path: "M 104 8 L 136 8 L 126 112 Q 107.5 126 101 109 Z" },
];

export interface HandLegendProps {
  /** Fingers this shape uses. The rest stay neutral. */
  used: ReadonlyArray<Exclude<Finger, null>>;
}

export function HandLegend({ used }: HandLegendProps) {
  return (
    <figure className="flex flex-none flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-[58px] w-auto min-[900px]:h-[96px]"
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
              ({ finger, path }) => (
                <path key={finger} d={path} fill={FINGER_COLOURS[finger]} />
              ),
            )}
          </g>
        </g>
      </svg>
      <figcaption className="label-caps">fingers</figcaption>
    </figure>
  );
}

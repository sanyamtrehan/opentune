"use client";

/**
 * Which finger is which colour, shown on a hand.
 *
 * Drawn here rather than taken from an icon set: stock hands are a single
 * silhouette path, and this needs each finger addressable so it can be
 * tinted and dimmed independently.
 *
 * It is the back of the fretting hand — a left hand seen from behind, which
 * is the view you have of your own hand over the neck, so the thumb is on
 * the left and the fingers run index to little across. Fingers the shape
 * does not use are drawn flat, so the hand also answers "which fingers do I
 * need" at a glance.
 */

import { FINGER_COLOURS, FINGER_NAMES } from "./ChordDiagram";
import type { Finger } from "@/core/chords/shapes.ts";

/**
 * A finger as a tapered capsule: wider at the knuckle, rounded at the tip,
 * and fanning slightly outwards the way a relaxed hand does.
 */
function fingerPath(
  baseX: number,
  tipX: number,
  tipY: number,
  baseWidth: number,
  tipWidth: number,
  options: { baseY?: number; roundBase?: boolean } = {},
): string {
  const baseY = options.baseY ?? 136;
  return [
    `M ${baseX - baseWidth} ${baseY}`,
    `L ${tipX - tipWidth} ${tipY + tipWidth}`,
    `A ${tipWidth} ${tipWidth} 0 0 1 ${tipX + tipWidth} ${tipY + tipWidth}`,
    `L ${baseX + baseWidth} ${baseY}`,
    // The silhouette wants a flat base so it unions cleanly with the palm.
    // The coloured overlay wants a round one, or the colour ends in a hard
    // line across the hand and the fingers look inserted rather than joined.
    options.roundBase
      ? `A ${baseWidth} ${baseWidth} 0 0 1 ${baseX - baseWidth} ${baseY}`
      : "",
    "Z",
  ].join(" ");
}

/*
 * Proportions matter more than detail at this size. A hand's fingers are
 * roughly as long as its palm; drawn much shorter they read as stubs on a
 * block, which is what the first attempt looked like.
 */
interface FingerShape {
  finger: Exclude<Finger, null>;
  /** Flat-based, for the silhouette. */
  path: string;
  /** Round-based, for the colour laid over it. */
  colour: string;
  /** Where the number sits, near the tip. */
  label: { x: number; y: number };
}

const GEOMETRY: ReadonlyArray<
  [Exclude<Finger, null>, number, number, number, number, number, { x: number; y: number }]
> = [
  [1, 62, 54, 44, 13.5, 11.5, { x: 54, y: 62 }],
  [2, 89, 87, 26, 14, 12, { x: 87, y: 45 }],
  [3, 116, 119, 36, 13.5, 11.5, { x: 119, y: 55 }],
  [4, 141, 150, 68, 12, 10, { x: 150, y: 86 }],
];

const FINGERS: readonly FingerShape[] = GEOMETRY.map(
  ([finger, baseX, tipX, tipY, baseWidth, tipWidth, label]) => ({
    finger,
    path: fingerPath(baseX, tipX, tipY, baseWidth, tipWidth),
    colour: fingerPath(baseX, tipX, tipY, baseWidth, tipWidth, {
      baseY: 130,
      roundBase: true,
    }),
    label,
  }),
);

/** Thumb: thicker, angled away from the palm, and never coloured — it sits
 *  behind the neck and stops nothing in an open chord. */
const THUMB = "M 58 154 L 20 132 A 15 15 0 0 1 36 108 L 66 130 Z";

/** The palm, narrowing towards the wrist the way a hand does. */
const PALM =
  "M 50 126 Q 48 118 58 118 L 155 118 Q 165 118 164 130 L 158 176 Q 154 196 132 196 L 82 196 Q 60 196 56 176 Z";

export interface HandLegendProps {
  /** Fingers this shape uses. Others are drawn flat. */
  used: ReadonlyArray<Exclude<Finger, null>>;
}

export function HandLegend({ used }: HandLegendProps) {
  return (
    <figure className="flex flex-none flex-col items-center gap-1.5">
      <svg
        viewBox="0 0 180 206"
        className="h-[132px] w-auto min-[900px]:h-[168px]"
        role="img"
        aria-label={FINGERS.map(
          ({ finger }) =>
            `${FINGER_NAMES[finger]} finger is number ${finger}${
              used.includes(finger) ? ", used in this chord" : ", not used"
            }`,
        ).join("; ")}
      >
        {/*
          * One silhouette, no strokes. Drawing the palm and each finger as
          * separate outlined shapes puts a line where they meet, which is
          * what made earlier attempts look like fingers standing in a
          * bucket. Concatenating every subpath into a single fill unions
          * them, and with no stroke there are no internal edges to give the
          * construction away.
          */}
        <path
          d={[PALM, THUMB, ...FINGERS.map((entry) => entry.path)].join(" ")}
          fill="var(--color-panel-raised)"
        />

        {FINGERS.map(({ finger, colour, label }) => {
          const active = used.includes(finger);
          if (!active) {
            return (
              <text
                key={finger}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="13"
                fontWeight="600"
                fill="var(--color-ink-faint)"
              >
                {finger}
              </text>
            );
          }
          return (
            <g key={finger}>
              <path d={colour} fill={FINGER_COLOURS[finger]} />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="13"
                fontWeight="600"
                fill="var(--color-ground)"
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

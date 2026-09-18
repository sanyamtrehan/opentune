"use client";

/**
 * Drag the diagram sideways to move along the neck.
 *
 * Small dots in a corner are a poor way to move between positions: they are
 * a long way from the thing they change, and they are a mouse-sized target
 * for a phone-sized job. Dragging puts the control on the diagram itself,
 * which is also the mental model — the shape is sliding up the neck.
 *
 * The dots stay, as an indicator of how many there are and which one you are
 * on, and remain clickable for anyone who would rather aim than drag.
 */

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

/** How far you must drag before it counts as a move rather than a wobble. */
const COMMIT_PX = 56;

/** Resistance once there is nothing further to move to. */
const EDGE_DAMPING = 0.25;

export interface PositionSliderProps {
  count: number;
  index: number;
  onChange: (index: number) => void;
  /** Described to screen readers, e.g. "E shape, 3rd fret". */
  label: string;
  children: ReactNode;
}

export function PositionSlider({
  count,
  index,
  onChange,
  label,
  children,
}: PositionSliderProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);

  const move = useCallback(
    (delta: number) => {
      const next = Math.min(count - 1, Math.max(0, index + delta));
      if (next !== index) onChange(next);
    },
    [count, index, onChange],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (count < 2 || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = event.clientX;
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = event.clientX - start.current;
    // Pull against the drag at the ends, so running out of positions is felt
    // rather than simply ignored.
    const atEdge = (delta > 0 && index === 0) || (delta < 0 && index === count - 1);
    setOffset(atEdge ? delta * EDGE_DAMPING : delta);
  };

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const delta = event.clientX - start.current;
    setOffset(0);
    if (Math.abs(delta) > COMMIT_PX) move(delta < 0 ? 1 : -1);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        role="group"
        aria-label={`Position ${index + 1} of ${count}: ${label}. Drag or use the arrow keys.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
        // `pan-y` so the page still scrolls vertically under the same finger.
        className={`w-full touch-pan-y rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
          count > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        {children}
      </div>

      {count > 1 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Position ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => onChange(i)}
              className={`h-2.5 cursor-pointer rounded-full transition-all ${
                i === index ? "w-7 bg-accent" : "w-2.5 bg-edge-strong hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

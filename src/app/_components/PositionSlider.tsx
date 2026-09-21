"use client";

/**
 * Move along the neck by dragging, swiping or pressing an arrow.
 *
 * Built as a track of every position rather than one diagram whose contents
 * get swapped. That distinction is the whole difference in how it feels: a
 * swapped diagram jumps and then slides, which reads as a glitch, while a
 * track genuinely moves and the next shape is already there behind the edge
 * of the window.
 */

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from "react";

/** How far you must drag before it counts as a move rather than a wobble. */
const COMMIT_RATIO = 0.22;

/** Resistance once there is nothing further to move to. */
const EDGE_DAMPING = 0.3;

/** Two-finger swipe: accumulated travel before it counts, and a pause after. */
const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN_MS = 420;

export interface PositionSliderProps {
  /** One node per position, in order along the neck. */
  items: ReactNode[];
  index: number;
  onChange: (index: number) => void;
  /** Described to screen readers, e.g. "E shape, 3rd fret". */
  label: string;
}

export function PositionSlider({ items, index, onChange, label }: PositionSliderProps) {
  const count = items.length;
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  const wheel = useRef({ travel: 0, until: 0 });

  const move = useCallback(
    (delta: number) => {
      const next = Math.min(count - 1, Math.max(0, index + delta));
      if (next !== index) onChange(next);
    },
    [count, index, onChange],
  );

  const width = () => viewport.current?.clientWidth ?? 1;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (count < 2 || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = event.clientX;
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = event.clientX - start.current;
    const atEdge = (delta > 0 && index === 0) || (delta < 0 && index === count - 1);
    setDrag(atEdge ? delta * EDGE_DAMPING : delta);
  };

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const delta = event.clientX - start.current;
    setDrag(0);
    if (Math.abs(delta) > width() * COMMIT_RATIO) move(delta < 0 ? 1 : -1);
  };

  /**
   * Two fingers on a trackpad arrive as horizontal wheel events. They come in
   * a long stream of small deltas, so they are accumulated and then ignored
   * for a moment — otherwise one flick sails through every position.
   */
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (count < 2) return;
    // A mostly-vertical gesture is the page being scrolled; leave it alone.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

    const now = performance.now();
    if (now < wheel.current.until) return;

    wheel.current.travel += event.deltaX;
    if (Math.abs(wheel.current.travel) < WHEEL_THRESHOLD) return;

    move(wheel.current.travel > 0 ? 1 : -1);
    wheel.current = { travel: 0, until: now + WHEEL_COOLDOWN_MS };
  };

  return (
    <div className="position-slider w-full">
      <Arrow
        area="ps-prev"
        direction="previous"
        disabled={index === 0}
        onClick={() => move(-1)}
        hidden={count < 2}
      />

      <div className="ps-view">
        <div
          ref={viewport}
          role="group"
          aria-label={`Position ${index + 1} of ${count}: ${label}. Drag, swipe or use the arrow keys.`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          onWheel={onWheel}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") move(1);
            if (event.key === "ArrowLeft") move(-1);
          }}
          /*
           * `select-none` because dragging across a diagram otherwise
           * highlights the fret numbers and note names under the pointer,
           * which looks broken. `touch-pan-y` so a vertical swipe with the
           * same finger still scrolls the page.
           */
          className={`ps-viewport mx-auto w-full touch-pan-y overflow-hidden rounded-xl select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent min-[900px]:max-w-[460px] ${
            count > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
        >
          <div
            className="ps-track flex"
            style={{
              transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
              transition: dragging
                ? "none"
                : "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {items.map((item, i) => (
              <div
                key={i}
                aria-hidden={i !== index}
                className="ps-item flex w-full shrink-0 items-center justify-center"
                // Neighbours are visible at the edge of the window while
                // dragging; dimming them keeps the current one the subject.
                style={{
                  opacity: i === index ? 1 : 0.45,
                  transition: "opacity 320ms ease",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Arrow
        area="ps-next"
        direction="next"
        disabled={index === count - 1}
        onClick={() => move(1)}
        hidden={count < 2}
      />

      {count > 1 && (
        <div className="ps-dots flex items-center">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Position ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => onChange(i)}
              // The dot is 10px; the button around it is 28 by 24, because
              // a thumb is not a mouse pointer and these sit under the
              // diagram where one will be.
              className="group flex h-6 w-5 cursor-pointer items-center justify-center"
            >
              <span
                className={`block h-2.5 rounded-full transition-all ${
                  i === index
                    ? "w-7 bg-accent"
                    : "w-2.5 bg-edge-strong group-hover:bg-ink-faint"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({
  area,
  direction,
  disabled,
  hidden,
  onClick,
}: {
  area: "ps-prev" | "ps-next";
  direction: "previous" | "next";
  disabled: boolean;
  hidden: boolean;
  onClick: () => void;
}) {
  const next = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${next ? "Next" : "Previous"} position`}
      className={`${area} flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border border-edge bg-panel text-ink-muted transition-colors hover:border-accent-edge hover:text-accent disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-ink-ghost ${
        hidden ? "invisible" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d={next ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

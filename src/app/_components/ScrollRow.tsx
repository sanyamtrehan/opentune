"use client";

/**
 * A row of tabs that scrolls inside itself.
 *
 * The obvious arrangement — a rounded pill inside a scrolling box — looks
 * wrong the moment the pill is wider than the box: the scroll container
 * clips it, and the far end of the row is cut off square while the near
 * end stays round. So the scrolling element is the pill. Its own radius
 * clips the content, both ends stay round, and the tabs slide about inside
 * a shape that does not move.
 *
 * With the scrollbar hidden there is then nothing to say the row goes on
 * past the edge, so the edges fade while there is more in that direction.
 * A fade that is always there would be a lie half the time, which is why
 * this watches the scroll position rather than painting one and hoping.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface ScrollRowProps {
  children: ReactNode;
  /** Announced to screen readers, e.g. "Chord root". */
  label: string;
  role?: "tablist" | "group";
}

export function ScrollRow({ children, label, role = "tablist" }: ScrollRowProps) {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  const measure = useCallback(() => {
    const element = box.current;
    if (!element) return;
    const furthest = element.scrollWidth - element.clientWidth;
    setMore({
      before: element.scrollLeft > 1,
      // A fraction short of the end still counts as the end: sub-pixel
      // widths would otherwise leave a fade showing with nothing behind it.
      after: element.scrollLeft < furthest - 1,
    });
  }, []);

  useEffect(() => {
    if (!box.current || !content.current) return;
    /*
     * Both boxes: the outer one changes with the window, the inner one when
     * the row gains a tab. Observing fires the callback straight away, which
     * is also how the first measurement happens — deliberately from the
     * observer rather than from the effect body, so the state is never set
     * during a render pass.
     */
    const observer = new ResizeObserver(measure);
    observer.observe(box.current);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={box}
        role={role}
        aria-label={label}
        onScroll={measure}
        className="no-scrollbar overflow-x-auto rounded-[12px] border border-edge bg-panel p-[3px]"
      >
        <div ref={content} className="flex w-max gap-1">
          {children}
        </div>
      </div>

      <Fade side="left" show={more.before} />
      <Fade side="right" show={more.after} />
    </div>
  );
}

/** Says there is more row in this direction, and gets out of the way. */
function Fade({ side, show }: { side: "left" | "right"; show: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-px w-10 transition-opacity duration-200 ${
        side === "left"
          ? "left-px rounded-l-[11px] bg-gradient-to-r"
          : "right-px rounded-r-[11px] bg-gradient-to-l"
      } from-panel to-transparent ${show ? "opacity-100" : "opacity-0"}`}
    />
  );
}

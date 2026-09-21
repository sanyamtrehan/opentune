"use client";

/**
 * Choosing among fifty chord qualities.
 *
 * Twenty of them are what anyone actually plays, and those stay in a row
 * you can see all of. The other thirty are real and someone will want
 * 7(♯5,♭9) one day, but putting all fifty on screen at once turns the page
 * into a wall of symbols and makes finding "m7" slower, not faster.
 *
 * So: the common ones in reach, the rest behind one press, grouped by
 * family. Grouping matters more than it looks — the whole vocabulary is
 * five ideas with variations, and a list that says so teaches something
 * that an alphabetical grid does not.
 */

import { useEffect, useRef } from "react";

import { BROWSABLE_QUALITIES, CHORD_FAMILIES } from "@/core/music/chords.ts";
import type { ChordQuality } from "@/core/music/chords.ts";

const COMMON = BROWSABLE_QUALITIES.filter((entry) => entry.common);

export interface QualityPickerProps {
  quality: ChordQuality;
  onChange: (quality: ChordQuality) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QualityPicker({ quality, onChange, open, onOpenChange }: QualityPickerProps) {
  const chosen = BROWSABLE_QUALITIES.find((entry) => entry.quality === quality)!;
  // A quality picked from the full list is shown at the end of the row, so
  // the thing you chose is never hidden behind the button you chose it with.
  const row = COMMON.some((entry) => entry.quality === quality)
    ? COMMON
    : [...COMMON, chosen];

  return (
    <>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Chord quality"
          className="flex w-max gap-1 rounded-[12px] border border-edge bg-panel p-[3px]"
        >
          {row.map(({ quality: value, label }) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={quality === value}
              onClick={() => onChange(value)}
              className={`cursor-pointer rounded-[9px] px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors min-[900px]:px-4 min-[900px]:py-2.5 min-[900px]:text-[15px] ${
                quality === value
                  ? "bg-accent-bg text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        title="Every chord quality in the library"
        className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-[12px] border px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors min-[900px]:py-2.5 min-[900px]:text-[15px] ${
          open
            ? "border-accent-edge bg-accent-bg text-accent"
            : "border-edge bg-panel text-ink-muted hover:text-ink"
        }`}
      >
        All {BROWSABLE_QUALITIES.length}
        <Chevron up={open} />
      </button>
    </>
  );
}

/** The full vocabulary, by family. Rendered under the rows that open it. */
export function QualityPanel({
  quality,
  onChange,
  onClose,
}: {
  quality: ChordQuality;
  onChange: (quality: ChordQuality) => void;
  onClose: () => void;
}) {
  return (
    <Panel onClose={onClose} label="Every chord quality">
      <div className="flex flex-col gap-4">
        {CHORD_FAMILIES.map((family) => (
          <div key={family}>
            <h3 className="mb-1.5 text-[10px] tracking-[0.16em] text-ink-faint uppercase">
              {family}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {BROWSABLE_QUALITIES.filter((entry) => entry.family === family).map(
                ({ quality: value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={quality === value}
                    onClick={() => {
                      onChange(value);
                      onClose();
                    }}
                    className={`cursor-pointer rounded-[9px] border px-3 py-1.5 font-mono text-[13px] whitespace-nowrap transition-colors ${
                      quality === value
                        ? "border-accent-edge bg-accent-bg text-accent"
                        : "border-edge bg-ground text-ink hover:border-accent-edge hover:text-accent-bright"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/**
 * A sheet that hangs under the controls, with everything behind it inert.
 *
 * Not a dropdown attached to its button: the grid is wider than the button
 * and the two pickers are the same kind of thing, so they share one shape
 * and one position rather than each sprouting its own menu.
 */
export function Panel({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Escape and a click anywhere outside. Both are what a sheet owes the
    // person who opened it by accident.
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const down = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", key);
    // Deferred, or the press that opened the panel closes it again.
    const timer = window.setTimeout(
      () => window.addEventListener("pointerdown", down),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [onClose]);

  return (
    <div className="relative z-20 mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,28px)]">
      {/* A scrim, so the sheet reads as one thing over the page rather
          than a card with the scale row showing round its corners. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-ground/60" />
      <div
        ref={panel}
        role="dialog"
        aria-label={label}
        className="absolute top-0 right-[clamp(16px,4vw,28px)] left-[clamp(16px,4vw,28px)] max-h-[min(58vh,520px)] overflow-y-auto rounded-[14px] border border-edge-strong bg-panel p-4 shadow-[0_18px_44px_rgba(0,0,0,0.55)]"
      >
        {children}
      </div>
    </div>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-3.5 w-3.5 transition-transform ${up ? "rotate-180" : ""}`}
      fill="none"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

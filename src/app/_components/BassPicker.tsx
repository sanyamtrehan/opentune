"use client";

/**
 * The note under the chord — the other half of a slash chord.
 *
 * G/D is a G chord with a D underneath it, and the thing worth knowing is
 * that the slash is not shorthand for a different chord. The notes are the
 * same; only the lowest one is spoken for. Two cases hide behind one
 * notation: G/D stands on a note the chord already has, which is an
 * inversion, while C/F stands on one it does not, which is a C triad with
 * a foreign note under it — and the second is why "slash chord" and
 * "inversion" are not synonyms.
 *
 * Off by default, and it says "no slash" rather than "none": the absence
 * of a bass note is not a setting anyone is choosing, it is the ordinary
 * state of a chord.
 */

import { respell, rootFromPitchClass, rootName } from "@/core/music/chords.ts";
import type { RootSpelling } from "@/core/music/chords.ts";

import { Panel } from "./QualityPicker";

export interface BassPickerProps {
  /** Pitch class of the note under the chord, or null for no slash. */
  bass: number | null;
  spelling: RootSpelling;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BassPicker({ bass, spelling, open, onOpenChange }: BassPickerProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => onOpenChange(!open)}
      title="Put a named note underneath — G/D, C/F"
      className={`flex flex-none cursor-pointer items-center gap-1 rounded-[12px] border px-3 py-2 font-mono text-[13px] font-medium whitespace-nowrap transition-colors min-[900px]:py-2.5 min-[900px]:text-[15px] ${
        bass !== null || open
          ? "border-accent-edge bg-accent-bg text-accent"
          : "border-edge bg-panel text-ink-muted hover:text-ink"
      }`}
    >
      <span aria-hidden="true">/</span>
      {bass === null ? (
        <span className="text-ink-faint">bass</span>
      ) : (
        nameOf(bass, spelling)
      )}
    </button>
  );
}

export function BassPanel({
  bass,
  onChange,
  spelling,
  onClose,
}: {
  bass: number | null;
  onChange: (bass: number | null) => void;
  spelling: RootSpelling;
  onClose: () => void;
}) {
  const choose = (value: number | null) => {
    onChange(value);
    onClose();
  };

  return (
    <Panel onClose={onClose} label="Note under the chord">
      <h3 className="mb-1.5 text-[10px] tracking-[0.16em] text-ink-faint uppercase">
        Note underneath
      </h3>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={bass === null}
          onClick={() => choose(null)}
          className={chipClass(bass === null)}
        >
          No slash
        </button>
        {Array.from({ length: 12 }, (_, pitchClass) => (
          <button
            key={pitchClass}
            type="button"
            aria-pressed={bass === pitchClass}
            onClick={() => choose(pitchClass)}
            className={`${chipClass(bass === pitchClass)} min-w-[46px] font-mono`}
          >
            {nameOf(pitchClass, spelling)}
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-[54ch] text-[12px] leading-relaxed text-ink-muted">
        The chord keeps its notes; only the lowest one changes. Choose a note
        the chord already contains and you get an inversion — G/D. Choose one
        it does not and you get something else again: C/F is a C chord
        standing on a note that is not in it.
      </p>
    </Panel>
  );
}

const chipClass = (on: boolean) =>
  `cursor-pointer rounded-[9px] border px-3 py-1.5 text-[13px] transition-colors ${
    on
      ? "border-accent-edge bg-accent-bg text-accent"
      : "border-edge bg-ground text-ink hover:border-accent-edge hover:text-accent-bright"
  }`;

const nameOf = (pitchClass: number, spelling: RootSpelling) =>
  rootName(respell(rootFromPitchClass(pitchClass, 3, spelling), spelling));

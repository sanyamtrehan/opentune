"use client";

/**
 * The tuning picker, as a bottom sheet.
 *
 * Replaces a native `<select>`. A select was defensible while there were
 * thirty presets and no way to look through them; it stops being defensible
 * once you want to search by the notes rather than the name — "what tuning is
 * D A D G A D" is a question people actually have, and a select cannot answer
 * it.
 *
 * A sheet also gives the A4 reference and the tuning builder somewhere to
 * live that is out of the way of the tuner itself.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { formatNote } from "@/core/music/notes.ts";
import { A440 } from "@/core/music/types.ts";
import type { Tuning, TuningFamily, TuningShape } from "@/core/music/types.ts";
import { resolveShape } from "@/core/tunings/resolve.ts";

const FAMILY_LABELS: ReadonlyArray<[TuningFamily, string]> = [
  ["standard", "Standard"],
  ["drop", "Drop"],
  ["open", "Open & modal"],
  ["other", "Other"],
];

const REFERENCES = [415, 432, A440, 442] as const;

interface Entry {
  id: string;
  name: string;
  notes: string;
  /** Lowercased name, aliases and notes, joined — the haystack for search. */
  haystack: string;
}

function toEntry(name: string, id: string, strings: string, aliases?: string[]): Entry {
  return {
    id,
    name,
    notes: strings,
    haystack: [name, strings, ...(aliases ?? [])].join(" ").toLowerCase(),
  };
}

/** Strip everything but letters and digits, so "D A D G A D" finds DADGAD. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface TuningSheetProps {
  open: boolean;
  onClose: () => void;
  presets: readonly TuningShape[];
  saved: readonly Tuning[];
  value: string;
  onPick: (id: string) => void;
  reference: number;
  onReference: (hz: number) => void;
  onBuildOwn: () => void;
}

export function TuningSheet({
  open,
  onClose,
  presets,
  saved,
  value,
  onPick,
  reference,
  onReference,
  onBuildOwn,
}: TuningSheetProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const groups = useMemo(() => {
    const preset = (shape: TuningShape) =>
      toEntry(
        shape.name,
        shape.id,
        resolveShape(shape).strings.map(formatNote).join(" "),
        shape.aliases,
      );

    return [
      // The user's own first: if they are looking for one, they know it exists.
      {
        name: "Yours",
        items: saved.map((tuning) =>
          toEntry(tuning.name, tuning.id, tuning.strings.map(formatNote).join(" ")),
        ),
      },
      ...FAMILY_LABELS.map(([family, label]) => ({
        name: label,
        items: presets.filter((shape) => shape.family === family).map(preset),
      })),
    ];
  }, [presets, saved]);

  const filtered = useMemo(() => {
    const needle = normalise(query);
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => normalise(item.haystack).includes(needle)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-20 flex items-end justify-center bg-[rgba(5,5,5,0.74)] backdrop-blur-md"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tunings"
        onClick={(event) => event.stopPropagation()}
        className="sheet-rise max-h-[88%] w-full max-w-[32.5rem] overflow-auto rounded-t-[1.375rem] border border-edge bg-[#111] p-[1.125rem] pb-[1.375rem]"
      >
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-base font-bold">Tunings</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer border-none bg-transparent text-xl leading-none text-ink-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <input
          ref={searchRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tunings — name or notes"
          className="mb-3.5 w-full rounded-[0.6875rem] border border-edge bg-panel-input px-3.5 py-[0.6875rem] text-sm text-ink outline-none placeholder:text-ink-faint focus-visible:border-accent-edge"
        />

        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nothing matches “{query}”.
          </p>
        )}

        {filtered.map((group) => (
          <div key={group.name}>
            <div className="label-caps mt-3.5 mb-2">{group.name}</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.375rem,1fr))] gap-2">
              {group.items.map((item) => {
                const selected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onPick(item.id);
                      setQuery("");
                      onClose();
                    }}
                    aria-pressed={selected}
                    className={`cursor-pointer rounded-[0.6875rem] border px-3 py-2.5 text-left ${
                      selected
                        ? "border-accent-edge bg-accent-bg text-accent"
                        : "border-edge bg-panel-input text-ink hover:border-accent-edge"
                    }`}
                  >
                    <span className="block text-sm">{item.name}</span>
                    <span className="mt-[3px] block font-mono text-[10px] tracking-wider text-ink-muted">
                      {item.notes}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="label-caps mt-5 mb-2">A4 reference</div>
        <div className="flex gap-2">
          {REFERENCES.map((hz) => {
            const selected = hz === reference;
            return (
              <button
                key={hz}
                type="button"
                onClick={() => onReference(hz)}
                aria-pressed={selected}
                className={`flex-1 cursor-pointer rounded-[0.6875rem] border py-[0.6875rem] font-mono text-sm tabular-nums ${
                  selected
                    ? "border-accent-edge bg-accent-bg text-accent"
                    : "border-edge bg-panel-input text-ink"
                }`}
              >
                {hz}
              </button>
            );
          })}
        </div>

        {/* The design had this as "coming soon". It is not — the editor has
            been working since before the redesign, so it opens the real one. */}
        <button
          type="button"
          onClick={() => {
            onBuildOwn();
            onClose();
          }}
          className="mt-[1.125rem] w-full cursor-pointer rounded-xl border border-dashed border-[#2e2e2e] py-3.5 text-sm text-ink-muted hover:border-accent-edge hover:text-accent"
        >
          Build your own
        </button>
      </div>
    </div>
  );
}

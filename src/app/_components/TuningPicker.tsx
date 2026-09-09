"use client";

/**
 * Tuning selector.
 *
 * A native `<select>` on purpose: it is keyboard accessible for free and on a
 * phone it opens the platform's own wheel, which is far easier to use
 * one-handed with a guitar in your lap than any custom dropdown.
 */

import type { Tuning, TuningFamily, TuningShape } from "@/core/music/types.ts";

const FAMILY_LABELS: ReadonlyArray<[TuningFamily, string]> = [
  ["standard", "Standard"],
  ["drop", "Drop"],
  ["open", "Open & modal"],
  ["other", "Other"],
];

export interface TuningPickerProps {
  presets: readonly TuningShape[];
  /** The user's own tunings, listed first because they went looking for them. */
  saved: readonly Tuning[];
  value: string;
  onChange: (id: string) => void;
}

export function TuningPicker({ presets, saved, value, onChange }: TuningPickerProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
        Tuning
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-edge bg-panel px-4 py-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
      >
        {saved.length > 0 && (
          <optgroup label="Yours">
            {saved.map((tuning) => (
              <option key={tuning.id} value={tuning.id}>
                {tuning.name}
              </option>
            ))}
          </optgroup>
        )}
        {FAMILY_LABELS.map(([family, label]) => {
          const group = presets.filter((preset) => preset.family === family);
          if (group.length === 0) return null;
          return (
            <optgroup key={family} label={label}>
              {group.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}

/**
 * Named presets.
 *
 * These are curated *labels* on a generative system, not the system itself.
 * Every entry is a pattern from `shapes.ts` at some root offset, and the
 * downtuned families are generated in a loop rather than typed out — which is
 * exactly the property that makes unnamed tunings free.
 */

import type { TuningShape } from "../music/types.ts";
import { pattern } from "./shapes.ts";

interface PresetSpec {
  id: string;
  name: string;
  patternId: string;
  rootOffset: number;
  aliases?: string[];
}

function build(spec: PresetSpec): TuningShape {
  return {
    id: spec.id,
    name: spec.name,
    shape: [...pattern(spec.patternId).intervals],
    rootOffset: spec.rootOffset,
    ...(spec.aliases ? { aliases: spec.aliases } : {}),
  };
}

/**
 * Names for each downtuned step, low to high pitch.
 *
 * Guitarists name these by the note the low string lands on, and switch
 * between flat and sharp names by convention rather than by rule — Eb, then
 * C#, not Db. The names are stated; the tunings are generated.
 */
const DOWNTUNED_STEPS: ReadonlyArray<{ offset: number; note: string; aliases?: string[] }> = [
  { offset: -1, note: "Eb", aliases: ["Half Step Down", "D# Standard"] },
  { offset: -2, note: "D", aliases: ["Whole Step Down"] },
  { offset: -3, note: "C#", aliases: ["Db Standard"] },
  { offset: -4, note: "C" },
  { offset: -5, note: "B" },
  { offset: -6, note: "Bb", aliases: ["A# Standard"] },
  { offset: -7, note: "A" },
];

/** Standard tuning and every downtuned version of it. */
const STANDARD_FAMILY: TuningShape[] = [
  build({ id: "standard", name: "Standard", patternId: "standard", rootOffset: 0, aliases: ["E Standard"] }),
  ...DOWNTUNED_STEPS.map((step) =>
    build({
      id: `${step.note.toLowerCase().replace("#", "sharp")}-standard`,
      name: `${step.note} Standard`,
      patternId: "standard",
      rootOffset: step.offset,
      aliases: step.aliases,
    }),
  ),
];

/** Drop D and every downtuned version of it. Drop C is Drop D minus two. */
const DROP_FAMILY: TuningShape[] = [
  { offset: -2, note: "D" },
  { offset: -3, note: "C#" },
  { offset: -4, note: "C" },
  { offset: -5, note: "B" },
  { offset: -6, note: "Bb" },
  { offset: -7, note: "A" },
].map((step) =>
  build({
    id: `drop-${step.note.toLowerCase().replace("#", "sharp")}`,
    name: `Drop ${step.note}`,
    patternId: "drop",
    rootOffset: step.offset,
  }),
);

const OTHERS: TuningShape[] = [
  build({ id: "double-drop-d", name: "Double Drop D", patternId: "double-drop", rootOffset: -2 }),
  build({ id: "double-drop-c", name: "Double Drop C", patternId: "double-drop", rootOffset: -4 }),

  build({ id: "dadgad", name: "DADGAD", patternId: "dadgad", rootOffset: -2, aliases: ["Celtic", "Dsus4"] }),
  build({ id: "cgcfgc", name: "CGCFGC", patternId: "dadgad", rootOffset: -4, aliases: ["DADGAD Down 2"] }),

  build({ id: "open-d", name: "Open D", patternId: "open-major-fifth-root", rootOffset: -2, aliases: ["Vestapol"] }),
  build({ id: "open-e", name: "Open E", patternId: "open-major-fifth-root", rootOffset: 0 }),

  build({ id: "open-d-minor", name: "Open D Minor", patternId: "open-minor-fifth-root", rootOffset: -2, aliases: ["Open Dm", "Cross-note D"] }),
  build({ id: "open-e-minor", name: "Open E Minor", patternId: "open-minor-fifth-root", rootOffset: 0, aliases: ["Open Em"] }),

  build({ id: "open-g", name: "Open G", patternId: "open-major-fourth-root", rootOffset: -2, aliases: ["Spanish", "Slack Key"] }),
  build({ id: "open-a", name: "Open A", patternId: "open-major-fourth-root", rootOffset: 0 }),
  build({ id: "open-f", name: "Open F", patternId: "open-major-fourth-root", rootOffset: -4 }),

  build({ id: "open-g-minor", name: "Open G Minor", patternId: "open-minor-fourth-root", rootOffset: -2, aliases: ["Open Gm", "Cross-note G"] }),
  build({ id: "open-a-minor", name: "Open A Minor", patternId: "open-minor-fourth-root", rootOffset: 0, aliases: ["Open Am"] }),

  build({ id: "open-c", name: "Open C", patternId: "open-c-wide", rootOffset: -4 }),

  build({ id: "all-fourths", name: "All Fourths", patternId: "all-fourths", rootOffset: 0 }),
  build({ id: "new-standard", name: "New Standard", patternId: "all-fifths", rootOffset: -4, aliases: ["NST", "Fripp", "All Fifths"] }),
  build({ id: "major-thirds", name: "Major Thirds", patternId: "major-thirds", rootOffset: 0 }),
];

export const PRESETS: readonly TuningShape[] = [
  ...STANDARD_FAMILY,
  ...DROP_FAMILY,
  ...OTHERS,
];

const BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

/** Look up a preset by id. Returns undefined for unknown ids. */
export function findPreset(id: string): TuningShape | undefined {
  return BY_ID.get(id);
}

/**
 * Find a preset by name or alias, case- and punctuation-insensitively, so
 * "drop d", "Drop-D" and "DROP D" all land in the same place.
 */
export function findPresetByName(query: string): TuningShape | undefined {
  const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = normalise(query);
  return PRESETS.find(
    (preset) =>
      normalise(preset.name) === target ||
      preset.aliases?.some((alias) => normalise(alias) === target),
  );
}

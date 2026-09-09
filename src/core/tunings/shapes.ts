/**
 * Interval patterns for 6-string guitar.
 *
 * The generative layer: a tuning is a pattern plus a root offset, never a
 * hand-typed note list. Open D and Open E are one pattern at two roots; Drop D
 * and Drop C are one pattern at two roots. See AGENTS.md.
 *
 * Only genuinely distinct patterns live here. Anything reachable by
 * transposing one of these belongs in `presets.ts`.
 */

import type { IntervalPattern } from "../music/types.ts";

/**
 * The root every `rootOffset` is measured from: the low string of standard
 * tuning. An offset of -2 means the whole tuning sits a tone below this.
 */
export const STANDARD_ROOT = "E2";

/** Standard tuning's pattern, named because so much is defined relative to it. */
export const STANDARD_INTERVALS: readonly number[] = [0, 5, 10, 15, 19, 24];

export const PATTERNS: readonly IntervalPattern[] = [
  {
    id: "standard",
    name: "Standard",
    // Fourths, with a major third between the 3rd and 2nd strings.
    intervals: [0, 5, 10, 15, 19, 24],
  },
  {
    id: "drop",
    name: "Drop",
    // Lowest string down a tone. Everything above keeps standard spacing, so
    // the intervals measured from the new root are all two semitones wider.
    intervals: [0, 7, 12, 17, 21, 26],
  },
  {
    id: "double-drop",
    name: "Double Drop",
    // Both outer strings down a tone.
    intervals: [0, 7, 12, 17, 21, 24],
  },
  {
    id: "dadgad",
    name: "Dsus4",
    // D A D G A D: the sus4 voicing behind DADGAD.
    intervals: [0, 7, 12, 17, 19, 24],
  },
  {
    id: "open-major-fifth-root",
    name: "Open major (fifth on top of root)",
    // Open D / Open E: root fifth root third fifth root.
    intervals: [0, 7, 12, 16, 19, 24],
  },
  {
    id: "open-minor-fifth-root",
    name: "Open minor (fifth on top of root)",
    // Open D minor / Open E minor.
    intervals: [0, 7, 12, 15, 19, 24],
  },
  {
    id: "open-major-fourth-root",
    name: "Open major (fourth on top of root)",
    // Open G / Open A: root fourth root fourth sixth root.
    intervals: [0, 5, 12, 17, 21, 24],
  },
  {
    id: "open-minor-fourth-root",
    name: "Open minor (fourth on top of root)",
    // Open G minor / Open A minor.
    intervals: [0, 5, 12, 17, 20, 24],
  },
  {
    id: "open-c-wide",
    name: "Open major (wide)",
    // Open C: C G C G C E, spread over two octaves and a third.
    intervals: [0, 7, 12, 19, 24, 28],
  },
  {
    id: "all-fourths",
    name: "All Fourths",
    intervals: [0, 5, 10, 15, 20, 25],
  },
  {
    id: "all-fifths",
    name: "All Fifths",
    // Robert Fripp's New Standard Tuning drops the top string to a minor
    // third, because a true fifth there is unplayable on normal gauges.
    intervals: [0, 7, 14, 21, 28, 31],
  },
  {
    id: "major-thirds",
    name: "Major Thirds",
    intervals: [0, 4, 8, 12, 16, 20],
  },
];

const BY_ID = new Map(PATTERNS.map((pattern) => [pattern.id, pattern]));

/** Look up an interval pattern. Throws: an unknown id is a programming error. */
export function pattern(id: string): IntervalPattern {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown interval pattern: ${id}`);
  return found;
}

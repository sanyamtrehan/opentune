/**
 * Every way to play a chord, in order of where your hand goes.
 *
 * The open shapes are hand-written because the eight of them are what people
 * actually learn, and no generator picks x32010 over some barre that scores
 * the same on paper. Everything else is generated from the movable patterns,
 * so all twelve roots are covered without twenty more hand-typed shapes to
 * get wrong.
 */

import type { ChordQuality } from "../music/chords.ts";
import type { Note } from "../music/types.ts";
import { MOVABLE_PATTERNS, shapeFromPattern } from "./movable.ts";
import { OPEN_SHAPES } from "./shapes.ts";
import type { ChordShape, FretPosition } from "./shapes.ts";

/** The lowest fretted fret, or 0 when the shape uses only open strings. */
export function lowestFret(frets: FretPosition[]): number {
  const fretted = frets.filter(
    (fret): fret is number => fret !== "muted" && fret > 0,
  );
  return fretted.length === 0 ? 0 : Math.min(...fretted);
}

/**
 * Where the diagram should start.
 *
 * Shapes at the nut draw from it. Anything higher drops the nut and labels
 * the top fret, which is what a chord book does — the alternative is a
 * diagram fifty frets tall.
 */
export function baseFret(shape: ChordShape): number {
  const lowest = lowestFret(shape.frets);
  return lowest <= 1 ? 1 : lowest;
}

/**
 * All the positions for a chord, nearest the nut first.
 *
 * Open shapes come before barres at the same fret, because if a chord has an
 * open voicing that is the one to learn.
 */
export function positionsFor(
  rootPitchClass: number,
  quality: ChordQuality,
  strings: Note[],
): ChordShape[] {
  const pitchClass = ((rootPitchClass % 12) + 12) % 12;

  const open = OPEN_SHAPES.filter(
    (shape) => shape.rootPitchClass === pitchClass && shape.quality === quality,
  );

  const movable = MOVABLE_PATTERNS.filter(
    (pattern) => pattern.quality === quality,
  )
    .map((pattern) => shapeFromPattern(pattern, pitchClass, strings))
    .filter((shape): shape is ChordShape => shape !== null);

  return [...open, ...movable].sort((a, b) => {
    const byFret = lowestFret(a.frets) - lowestFret(b.frets);
    if (byFret !== 0) return byFret;
    // An open voicing and a barre can start at the same fret; prefer the open.
    return (a.barre ? 1 : 0) - (b.barre ? 1 : 0);
  });
}

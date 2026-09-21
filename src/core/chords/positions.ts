/**
 * Every way to play a chord, in order of where your hand goes.
 *
 * The open shapes are hand-written because the eight of them are what people
 * actually learn, and no generator picks x32010 over some barre that scores
 * the same on paper. Everything else is generated from the movable patterns,
 * so all twelve roots are covered without twenty more hand-typed shapes to
 * get wrong.
 */

import { buildChord, essentialTones, rootFromPitchClass } from "../music/chords.ts";
import type { ChordQuality } from "../music/chords.ts";
import { midiOf } from "../music/notes.ts";
import type { Note } from "../music/types.ts";
import { MOVABLE_PATTERNS, shapesFromPattern } from "./movable.ts";
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

/** How many strings a shape actually sounds. */
const soundingCount = (shape: ChordShape) =>
  shape.frets.filter((fret) => fret !== "muted").length;

/**
 * All the positions for a chord, nearest the nut first.
 *
 * Open shapes come before barres at the same fret, because if a chord has an
 * open voicing that is the one to learn. Where a full shape and one of its
 * partials start at the same fret the full one leads, for the same reason:
 * the partials are what you reach for once you know it.
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

  /*
   * A voicing that has dropped one of the notes that make the chord what it
   * is belongs under a different name, whatever the diagram is filed under:
   * the top four of an A shape major is the chord, the bottom four is a root
   * and a fifth — a power chord. So the generated partials are filtered
   * against the chord itself rather than trusted because their parent was
   * right.
   *
   * `essentialTones` is what "the notes that make it what it is" means, and
   * past a triad that excludes the fifth — otherwise the standard 9th chord,
   * which has no fifth in it, would be thrown out as not a 9th chord.
   */
  const wanted = new Set(
    essentialTones(buildChord(rootFromPitchClass(pitchClass), quality)).map((tone) =>
      ((midiOf(tone.note) % 12) + 12) % 12,
    ),
  );
  const complete = (shape: ChordShape) => {
    const sounds = new Set(
      shape.frets.flatMap((fret, index) =>
        fret === "muted" ? [] : [((midiOf(strings[index]) + fret) % 12 + 12) % 12],
      ),
    );
    return [...wanted].every((pitch) => sounds.has(pitch));
  };

  const movable = MOVABLE_PATTERNS.filter(
    (pattern) => pattern.quality === quality,
  )
    .flatMap((pattern) => shapesFromPattern(pattern, pitchClass, strings))
    .filter(complete);

  return [...open, ...movable].sort((a, b) => {
    const byFret = lowestFret(a.frets) - lowestFret(b.frets);
    if (byFret !== 0) return byFret;
    // A full shape and its own four-string window start at the same fret;
    // the full one leads.
    const byWidth = soundingCount(b) - soundingCount(a);
    if (byWidth !== 0) return byWidth;
    // An open voicing and a barre can start at the same fret; prefer the open.
    return (a.barre ? 1 : 0) - (b.barre ? 1 : 0);
  });
}

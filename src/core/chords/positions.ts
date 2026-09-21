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
import type { Chord, ChordQuality } from "../music/chords.ts";
import { midiOf } from "../music/notes.ts";
import type { Note } from "../music/types.ts";
import { MOVABLE_PATTERNS, shapesFromPattern } from "./movable.ts";
import { OPEN_SHAPES } from "./shapes.ts";
import type { ChordShape, FretPosition } from "./shapes.ts";
import { generateVoicings } from "./voicings.ts";

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
 * How many positions are worth offering. Past this it is a phone book.
 */
const MOST_POSITIONS = 8;

export interface PositionOptions {
  /**
   * The note that must be lowest, as a pitch class, for a slash chord.
   * Null for the ordinary case of the root in the bass.
   */
  bass?: number | null;
}

/**
 * All the positions for a chord, nearest the nut first.
 *
 * Two sources, in that order of preference. The hand-written shapes come
 * first because a search does not know that x32010 is *the* C major, or
 * that the E shape barre is the one every guitarist already has in their
 * hands. Then the search fills in: every quality past the eleven with
 * hand-written patterns has only found shapes, and a chord with a slash
 * bass has only found shapes whatever its quality, because none of the
 * curated ones put anything but the root underneath.
 *
 * Open shapes come before barres at the same fret, because if a chord has
 * an open voicing that is the one to learn. Where a full shape and one of
 * its partials start at the same fret the full one leads, for the same
 * reason: the partials are what you reach for once you know it.
 */
export function positionsFor(
  rootPitchClass: number,
  quality: ChordQuality,
  strings: Note[],
  options: PositionOptions = {},
): ChordShape[] {
  const pitchClass = ((rootPitchClass % 12) + 12) % 12;
  const bass = options.bass ?? null;
  const chord = buildChord(
    rootFromPitchClass(pitchClass),
    quality,
    bass === null ? null : rootFromPitchClass(bass),
  );

  const curated = bass === null ? curatedFor(chord, pitchClass, strings) : [];

  /*
   * Only fill up to the limit, and only at hand positions the curated
   * shapes have not already claimed. C major has nine hand-written
   * positions and does not need a tenth found for it; Cdim7 has none and
   * needs all of them.
   */
  const taken = new Set(curated.map((shape) => lowestFret(shape.frets)));
  /*
   * A hand-written open chord claims the whole open position, not just its
   * own lowest fret. The search can find a perfectly good x-3-0-0-1-0 for
   * Cadd9, but the open Cadd9 everybody plays is x-3-2-0-3-0, and the one
   * that leads the list should be that one.
   */
  if (curated.some((shape) => shape.frets.includes(0))) {
    for (const fret of [0, 1, 2]) taken.add(fret);
  }
  const found = generateVoicings(chord, strings, { limit: MOST_POSITIONS })
    .filter((shape) => !taken.has(lowestFret(shape.frets)))
    .slice(0, Math.max(0, MOST_POSITIONS - curated.length));

  return [...curated, ...found].sort((a, b) => {
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

/** The hand-written shapes for a chord: open voicings, then movable ones. */
function curatedFor(
  chord: Chord,
  pitchClass: number,
  strings: Note[],
): ChordShape[] {
  const open = OPEN_SHAPES.filter(
    (shape) =>
      shape.rootPitchClass === pitchClass && shape.quality === chord.quality,
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
    essentialTones(chord).map((tone) => ((midiOf(tone.note) % 12) + 12) % 12),
  );
  const complete = (shape: ChordShape) => {
    const sounds = new Set(
      shape.frets.flatMap((fret, index) =>
        fret === "muted" ? [] : [(((midiOf(strings[index]) + fret) % 12) + 12) % 12],
      ),
    );
    return [...wanted].every((pitch) => sounds.has(pitch));
  };

  const movable = MOVABLE_PATTERNS.filter(
    (pattern) => pattern.quality === chord.quality,
  )
    .flatMap((pattern) => shapesFromPattern(pattern, pitchClass, strings))
    .filter(complete);

  return [...open, ...movable];
}

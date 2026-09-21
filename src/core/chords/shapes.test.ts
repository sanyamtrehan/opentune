import test from "node:test";
import assert from "node:assert/strict";

import { buildChord, essentialTones, rootFromPitchClass, toneAt } from "../music/chords.ts";
import { formatNote, midiOf } from "../music/notes.ts";
import { findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import { OPEN_SHAPES, findShape, hasShape } from "./shapes.ts";
import type { ChordShape } from "./shapes.ts";

const standard = resolveShape(findPreset("standard")!).strings;

/** What a shape actually sounds, low string first, skipping muted strings. */
function soundingMidi(shape: ChordShape): number[] {
  return shape.frets.flatMap((fret, index) =>
    fret === "muted" ? [] : [midiOf(standard[index]) + fret],
  );
}

test("every shape really is the chord it claims to be", () => {
  /*
   * The reason this file exists. Shapes typed by hand will contain a typo,
   * and a wrong fret produces a chord with a note that does not belong in it
   * — which looks plausible on a diagram and is wrong in the ear.
   */
  for (const shape of OPEN_SHAPES) {
    const chord = buildChord(rootFromPitchClass(shape.rootPitchClass), shape.quality);
    const expected = new Set(
      chord.tones.map((tone) => ((midiOf(tone.note) % 12) + 12) % 12),
    );

    for (const midi of soundingMidi(shape)) {
      const pitchClass = ((midi % 12) + 12) % 12;
      assert.ok(
        expected.has(pitchClass),
        `${shape.id} sounds a note that is not in ${chord.symbol}: ` +
          `${formatNote(chord.tones[0].note)} chord, stray pitch class ${pitchClass}`,
      );
    }

    // And every tone that makes the chord what it is: a triad missing its
    // third is not the chord, it is a power chord. The fifth of a seventh
    // chord is the exception, and the open C7 takes it — x32310 has no G.
    const sounded = new Set(
      soundingMidi(shape).map((midi) => ((midi % 12) + 12) % 12),
    );
    for (const tone of essentialTones(chord)) {
      const pitchClass = ((midiOf(tone.note) % 12) + 12) % 12;
      assert.ok(
        sounded.has(pitchClass),
        `${shape.id} is missing the ${tone.degree} (${formatNote(tone.note)})`,
      );
    }
  }
});

test("every shape is in open position and playable", () => {
  for (const shape of OPEN_SHAPES) {
    assert.equal(shape.frets.length, 6, `${shape.id} needs six strings`);
    assert.equal(shape.fingers.length, 6, `${shape.id} needs six fingers`);

    /*
     * What makes a shape belong in this file rather than in `movable.ts`:
     * it uses the nut as a finger. Without an open string it has a movable
     * form and should be generated instead of typed.
     */
    assert.ok(
      shape.frets.some((fret) => fret === 0),
      `${shape.id} has no open string, so it is a movable shape`,
    );

    // One hand's worth of reach. Aadd9 stretches to the 4th fret, which is
    // as far as an open shape goes.
    const fretted = shape.frets.filter(
      (fret): fret is number => fret !== "muted" && fret > 0,
    );
    const span = Math.max(...fretted) - Math.min(...fretted);
    assert.ok(span <= 3, `${shape.id} spans ${span} frets`);

    // A fretted string needs a finger; an open or muted one must not have one.
    shape.frets.forEach((fret, index) => {
      const finger = shape.fingers[index];
      if (typeof fret === "number" && fret > 0) {
        assert.ok(finger !== null, `${shape.id} string ${6 - index} has no finger`);
      } else {
        assert.equal(finger, null, `${shape.id} string ${6 - index} has a stray finger`);
      }
    });

    /*
     * A finger may be used twice only as a small barre — two adjacent
     * strings at the same fret, which is how Dm7 is played. Anywhere else a
     * repeated finger is a typo.
     */
    const byFinger = new Map<number, number[]>();
    shape.fingers.forEach((finger, index) => {
      if (finger !== null) byFinger.set(finger, [...(byFinger.get(finger) ?? []), index]);
    });
    for (const [finger, strings] of byFinger) {
      if (strings.length === 1) continue;
      const frets = strings.map((index) => shape.frets[index]);
      assert.ok(
        strings.length === 2 &&
          strings[1] === strings[0] + 1 &&
          frets[0] === frets[1],
        `${shape.id} uses finger ${finger} on strings that are not a barre`,
      );
    }
  }
});

test("the root is the lowest note sounding", () => {
  // True of all eight open shapes, and what makes them sound settled. If a
  // later shape breaks this it is an inversion and the pro panel must say so.
  for (const shape of OPEN_SHAPES) {
    const chord = buildChord(rootFromPitchClass(shape.rootPitchClass), shape.quality);
    const lowest = Math.min(...soundingMidi(shape));
    const tone = toneAt(chord, lowest);
    assert.equal(tone?.degree, "1", `${shape.id} has ${formatNote(tone!.note)} in the bass`);
  }
});

test("lookup finds a shape, and admits when there is none", () => {
  assert.equal(findShape(0, "major")?.id, "c-major");
  assert.equal(findShape(9, "minor")?.id, "a-minor");
  assert.equal(findShape(12, "major")?.id, "c-major", "octaves fold");

  assert.equal(findShape(4, "dominant7")?.id, "e-dominant7");
  assert.equal(findShape(0, "add9")?.id, "c-add9");

  // No open string can be pressed into service for these.
  assert.equal(findShape(0, "minor"), undefined, "C minor has no open shape");
  assert.equal(findShape(5, "major"), undefined, "F needs a barre");
  assert.equal(findShape(1, "major"), undefined);
  assert.equal(findShape(0, "dominant7sharp9"), undefined, "only E has one");

  assert.ok(hasShape(4, "minor"));
  assert.ok(!hasShape(11, "major"));
});

test("ids are unique, and the triads are still the ones everyone learns", () => {
  const ids = OPEN_SHAPES.map((shape) => shape.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique");
  assert.deepEqual(
    OPEN_SHAPES.filter((shape) => shape.quality === "major").map((shape) => shape.id),
    ["c-major", "d-major", "e-major", "g-major", "a-major"],
  );
  assert.deepEqual(
    OPEN_SHAPES.filter((shape) => shape.quality === "minor").map((shape) => shape.id),
    ["d-minor", "e-minor", "a-minor"],
  );
});

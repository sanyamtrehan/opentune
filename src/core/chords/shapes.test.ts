import test from "node:test";
import assert from "node:assert/strict";

import { buildChord, rootFromPitchClass, toneAt } from "../music/chords.ts";
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
   * The reason this file exists. Eight shapes typed by hand will contain a
   * typo, and a wrong fret produces a chord with a note that does not belong
   * in it — which looks plausible on a diagram and is wrong in the ear.
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

    // And every chord tone is present: a triad missing its third is not the
    // chord, it is a power chord.
    const sounded = new Set(
      soundingMidi(shape).map((midi) => ((midi % 12) + 12) % 12),
    );
    for (const tone of chord.tones) {
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

    for (const fret of shape.frets) {
      if (fret === "muted") continue;
      assert.ok(fret >= 0 && fret <= 3, `${shape.id} leaves open position at ${fret}`);
    }

    // A fretted string needs a finger; an open or muted one must not have one.
    shape.frets.forEach((fret, index) => {
      const finger = shape.fingers[index];
      if (typeof fret === "number" && fret > 0) {
        assert.ok(finger !== null, `${shape.id} string ${6 - index} has no finger`);
      } else {
        assert.equal(finger, null, `${shape.id} string ${6 - index} has a stray finger`);
      }
    });

    // No finger used twice: these are open shapes, so there are no barres.
    const used = shape.fingers.filter((finger) => finger !== null);
    assert.equal(new Set(used).size, used.length, `${shape.id} reuses a finger`);
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

test("lookup finds the eight, and admits to the rest", () => {
  assert.equal(findShape(0, "major")?.id, "c-major");
  assert.equal(findShape(9, "minor")?.id, "a-minor");
  assert.equal(findShape(12, "major")?.id, "c-major", "octaves fold");

  // Deliberately absent in this draft.
  assert.equal(findShape(0, "minor"), undefined, "C minor has no open shape");
  assert.equal(findShape(5, "major"), undefined, "F needs a barre");
  assert.equal(findShape(1, "major"), undefined);

  assert.ok(hasShape(4, "minor"));
  assert.ok(!hasShape(11, "major"));
});

test("the draft is exactly the eight open chords", () => {
  assert.equal(OPEN_SHAPES.length, 8);
  const ids = OPEN_SHAPES.map((shape) => shape.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique");
  assert.deepEqual(
    OPEN_SHAPES.filter((shape) => shape.quality === "minor").map((shape) => shape.id),
    ["d-minor", "e-minor", "a-minor"],
  );
});

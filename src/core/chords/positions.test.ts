import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSABLE_QUALITIES,
  buildChord,
  essentialTones,
  rootFromPitchClass,
} from "../music/chords.ts";
import { formatNote, midiOf } from "../music/notes.ts";
import { findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import { analyseShape } from "./analysis.ts";
import { baseFret, lowestFret, positionsFor } from "./positions.ts";
import type { ChordShape } from "./shapes.ts";

const standard = resolveShape(findPreset("standard")!).strings;

/** Every chord the browser can show: twelve roots by eleven qualities. */
function* everyChord() {
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const { quality } of BROWSABLE_QUALITIES) {
      yield { pitchClass, quality };
    }
  }
}

const sounding = (shape: ChordShape) =>
  shape.frets.flatMap((fret, index) =>
    fret === "muted" ? [] : [midiOf(standard[index]) + fret],
  );

test("every chord the browser offers has somewhere to be played", () => {
  for (const { pitchClass, quality } of everyChord()) {
    const positions = positionsFor(pitchClass, quality, standard);
    const chord = buildChord(rootFromPitchClass(pitchClass), quality);
    assert.ok(
      positions.length >= 2,
      `${chord.symbol} has only ${positions.length}`,
    );
  }
});

test("every generated shape really is the chord it claims to be", () => {
  /*
   * The same check the hand-written shapes get, and it matters more here:
   * a wrong offset in one pattern is wrong in all twelve keys at once.
   */
  for (const { pitchClass, quality } of everyChord()) {
    const chord = buildChord(rootFromPitchClass(pitchClass), quality);
    const expected = new Set(
      chord.tones.map((tone) => ((midiOf(tone.note) % 12) + 12) % 12),
    );

    for (const shape of positionsFor(pitchClass, quality, standard)) {
      const pitches = sounding(shape).map((midi) => ((midi % 12) + 12) % 12);
      for (const pitch of pitches) {
        assert.ok(
          expected.has(pitch),
          `${shape.id} (${shape.name}) sounds a note outside ${chord.symbol}`,
        );
      }
      for (const tone of essentialTones(chord)) {
        assert.ok(
          pitches.includes(((midiOf(tone.note) % 12) + 12) % 12),
          `${shape.id} (${shape.name}) is missing the ${tone.degree} of ${chord.symbol}`,
        );
      }
    }
  }
});

test("the root is in the bass of every full shape", () => {
  /*
   * What makes a barre chord sound like the chord rather than an inversion.
   * The four-string windows are exempt on purpose — dropping the low strings
   * is exactly how you get a C/G — but their bass still has to be a note of
   * the chord, not a stray.
   */
  for (const { pitchClass, quality } of everyChord()) {
    const chord = buildChord(rootFromPitchClass(pitchClass), quality);
    for (const shape of positionsFor(pitchClass, quality, standard)) {
      const analysis = analyseShape(shape, chord, standard);
      assert.notEqual(
        analysis.bass.degree,
        null,
        `${shape.name} of ${chord.symbol} is rooted on a note outside the chord`,
      );
      if (shape.frets.filter((fret) => fret !== "muted").length < 5) continue;
      assert.equal(
        analysis.bass.degree,
        "1",
        `${shape.name} of ${chord.symbol} has ${formatNote(analysis.bass.note)} in the bass`,
      );
    }
  }
});

test("barre shapes are playable: one fret span, fingers where they belong", () => {
  for (const { pitchClass, quality } of everyChord()) {
      for (const shape of positionsFor(pitchClass, quality, standard)) {
        const fretted = shape.frets.filter(
          (fret): fret is number => fret !== "muted" && fret > 0,
        );
        const span = Math.max(...fretted) - Math.min(...fretted);
        assert.ok(span <= 3, `${shape.id} spans ${span} frets`);

        shape.frets.forEach((fret, index) => {
          const finger = shape.fingers[index];
          if (typeof fret === "number" && fret > 0) {
            assert.ok(finger !== null, `${shape.id} string ${6 - index} has no finger`);
          } else {
            assert.equal(finger, null, `${shape.id} string ${6 - index} has a stray finger`);
          }
        });

        if (shape.barre) {
          // The barred strings must all sit at the barre's own fret.
          for (let i = shape.barre.from; i <= shape.barre.to; i += 1) {
            const fret = shape.frets[i];
            if (fret === "muted") continue;
            assert.ok(
              fret >= shape.barre.fret,
              `${shape.id} frets below its own barre`,
            );
          }
        }
      }
  }
});

test("the familiar chords still lead with their open shape", () => {
  for (const [pitchClass, quality, id] of [
    [0, "major", "c-major"],
    [2, "major", "d-major"],
    [9, "minor", "a-minor"],
    [4, "dominant7", "e-dominant7"],
    [9, "minor7", "a-minor7"],
    [0, "add9", "c-add9"],
    [4, "dominant7sharp9", "e-dominant7sharp9"],
  ] as const) {
    assert.equal(positionsFor(pitchClass, quality, standard)[0].id, id);
  }
});

test("positions run up the neck, not in the order they were defined", () => {
  const positions = positionsFor(0, "major", standard);
  const frets = positions.map((shape) => lowestFret(shape.frets));
  assert.deepEqual([...frets].sort((a, b) => a - b), frets, frets.join());
  // C major: the open shape, the A shape and its two windows at 3, the E
  // shape and its three windows at 8, then the D shape at 10.
  assert.deepEqual(
    positions.map((shape) => lowestFret(shape.frets)),
    [1, 3, 3, 3, 8, 8, 8, 8, 10],
  );
  assert.deepEqual(positions.map((shape) => shape.name), [
    "Open",
    "A shape, 3rd fret",
    "Middle four, 3rd fret",
    "Top four, 3rd fret",
    "E shape, 8th fret",
    "Low four, 8th fret",
    "Middle four, 8th fret",
    "Top four, 8th fret",
    "D shape, 10th fret",
  ]);
});

test("the diagram starts at the nut only when the shape does", () => {
  const [open, aShape] = positionsFor(0, "major", standard);
  assert.equal(baseFret(open), 1, "the open C draws from the nut");
  assert.equal(baseFret(aShape), 3, "the barre at the 3rd draws from the 3rd");
});

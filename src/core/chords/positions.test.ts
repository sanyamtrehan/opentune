import test from "node:test";
import assert from "node:assert/strict";

import { buildChord, rootFromPitchClass } from "../music/chords.ts";
import { formatNote, midiOf } from "../music/notes.ts";
import { findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import { analyseShape } from "./analysis.ts";
import { baseFret, lowestFret, positionsFor } from "./positions.ts";
import type { ChordShape } from "./shapes.ts";

const standard = resolveShape(findPreset("standard")!).strings;

const sounding = (shape: ChordShape) =>
  shape.frets.flatMap((fret, index) =>
    fret === "muted" ? [] : [midiOf(standard[index]) + fret],
  );

test("every root now has somewhere to be played, major and minor", () => {
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const quality of ["major", "minor"] as const) {
      const positions = positionsFor(pitchClass, quality, standard);
      assert.ok(
        positions.length >= 2,
        `${pitchClass} ${quality} has only ${positions.length}`,
      );
    }
  }
});

test("every generated shape really is the chord it claims to be", () => {
  /*
   * The same check the hand-written shapes get, and it matters more here:
   * a wrong offset in one pattern is wrong in all twelve keys at once.
   */
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const quality of ["major", "minor"] as const) {
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
        for (const tone of chord.tones) {
          assert.ok(
            pitches.includes(((midiOf(tone.note) % 12) + 12) % 12),
            `${shape.id} (${shape.name}) is missing the ${tone.degree} of ${chord.symbol}`,
          );
        }
      }
    }
  }
});

test("the root is in the bass of every barre shape", () => {
  // What makes a barre chord sound like the chord rather than an inversion.
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const quality of ["major", "minor"] as const) {
      const chord = buildChord(rootFromPitchClass(pitchClass), quality);
      for (const shape of positionsFor(pitchClass, quality, standard)) {
        const analysis = analyseShape(shape, chord, standard);
        assert.equal(
          analysis.bass.degree,
          "1",
          `${shape.name} of ${chord.symbol} has ${formatNote(analysis.bass.note)} in the bass`,
        );
      }
    }
  }
});

test("barre shapes are playable: one fret span, fingers where they belong", () => {
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (const quality of ["major", "minor"] as const) {
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
  }
});

test("the familiar chords still lead with their open shape", () => {
  for (const [pitchClass, quality, id] of [
    [0, "major", "c-major"],
    [2, "major", "d-major"],
    [9, "minor", "a-minor"],
  ] as const) {
    assert.equal(positionsFor(pitchClass, quality, standard)[0].id, id);
  }
});

test("positions run up the neck, not in the order they were defined", () => {
  const positions = positionsFor(0, "major", standard);
  const frets = positions.map((shape) => lowestFret(shape.frets));
  assert.deepEqual([...frets].sort((a, b) => a - b), frets, frets.join());
  // C major: open, then the A shape at 3, then the E shape at 8.
  assert.deepEqual(positions.map((shape) => lowestFret(shape.frets)), [1, 3, 8]);
});

test("the diagram starts at the nut only when the shape does", () => {
  const [open, aShape] = positionsFor(0, "major", standard);
  assert.equal(baseFret(open), 1, "the open C draws from the nut");
  assert.equal(baseFret(aShape), 3, "the barre at the 3rd draws from the 3rd");
});

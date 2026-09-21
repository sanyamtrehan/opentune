import test from "node:test";
import assert from "node:assert/strict";

import {
  CHORD_QUALITIES,
  buildChord,
  essentialTones,
  rootFromPitchClass,
} from "../music/chords.ts";
import type { Chord } from "../music/chords.ts";
import { formatNote, midiOf } from "../music/notes.ts";
import { findPreset } from "../tunings/presets.ts";
import { resolveShape } from "../tunings/resolve.ts";
import type { ChordShape, FretPosition } from "./shapes.ts";
import { fingering, generateVoicings } from "./voicings.ts";

const standard = resolveShape(findPreset("standard")!).strings;

const pitchClass = (value: number) => ((value % 12) + 12) % 12;

/** Every chord in the library: fifty qualities on twelve roots. */
function* everyChord(): Generator<Chord> {
  for (let root = 0; root < 12; root += 1) {
    for (const quality of CHORD_QUALITIES) {
      yield buildChord(rootFromPitchClass(root), quality);
    }
  }
}

function sounding(shape: ChordShape): number[] {
  return shape.frets.flatMap((fret, string) =>
    fret === "muted" ? [] : [midiOf(standard[string]) + fret],
  );
}

/*
 * These tests are the whole warrant for generating shapes rather than
 * typing them. Six hundred chords is far past the point where reading the
 * output tells you whether it is right, so every claim the generator makes
 * is checked on every chord it can produce.
 */

test("every chord in the library has somewhere to be played", () => {
  for (const chord of everyChord()) {
    const found = generateVoicings(chord, standard);
    assert.ok(found.length > 0, `nothing found for ${chord.symbol}`);
  }
});

test("no voicing sounds a note that is not in the chord", () => {
  for (const chord of everyChord()) {
    const allowed = new Set(chord.tones.map((tone) => pitchClass(midiOf(tone.note))));
    for (const shape of generateVoicings(chord, standard)) {
      for (const midi of sounding(shape)) {
        assert.ok(
          allowed.has(pitchClass(midi)),
          `${chord.symbol} ${describe(shape.frets)} sounds pitch class ${pitchClass(midi)}`,
        );
      }
    }
  }
});

test("the root is underneath, in every voicing of every chord", () => {
  // What stops the library quietly offering an inversion under the plain
  // name. Inversions have their own name — that is what the slash is for.
  for (const chord of everyChord()) {
    const root = pitchClass(midiOf(chord.root));
    for (const shape of generateVoicings(chord, standard)) {
      const lowest = Math.min(...sounding(shape));
      assert.equal(
        pitchClass(lowest),
        root,
        `${chord.symbol} ${describe(shape.frets)} has ${formatNote(chord.root)} above its bass`,
      );
    }
  }
});

test("a voicing gives up notes in order, and never the ones that name it", () => {
  /*
   * Big chords have to lose notes — seven of them will not fit under four
   * fingers — but which notes is not a free choice. Whatever else goes, a
   * voicing keeps the root and the third, because without them it is not
   * recognisably the chord at all.
   */
  for (const chord of everyChord()) {
    const third = chord.tones.find(
      (tone) => tone.degree === "3" || tone.degree === "♭3",
    );
    for (const shape of generateVoicings(chord, standard)) {
      const pitches = new Set(sounding(shape).map(pitchClass));
      assert.ok(
        pitches.has(pitchClass(midiOf(chord.root))),
        `${chord.symbol} ${describe(shape.frets)} has no root`,
      );
      if (third) {
        assert.ok(
          pitches.has(pitchClass(midiOf(third.note))),
          `${chord.symbol} ${describe(shape.frets)} has no third`,
        );
      }
    }
  }
});

test("the chords that fit keep every note they are supposed to", () => {
  // Compromise is for the ones that cannot be held otherwise. A four-note
  // chord has no excuse, and the search must not take the easy way out.
  for (const chord of everyChord()) {
    if (essentialTones(chord).length > 4) continue;
    const wanted = essentialTones(chord).map((tone) => pitchClass(midiOf(tone.note)));
    for (const shape of generateVoicings(chord, standard)) {
      const pitches = new Set(sounding(shape).map(pitchClass));
      for (const pitch of wanted) {
        assert.ok(
          pitches.has(pitch),
          `${chord.symbol} ${describe(shape.frets)} is missing a note it could have held`,
        );
      }
    }
  }
});

test("every voicing is one hand: four fingers, four frets, no gaps", () => {
  for (const chord of everyChord()) {
    for (const shape of generateVoicings(chord, standard)) {
      const where = `${chord.symbol} ${describe(shape.frets)}`;
      const fretted = shape.frets.filter(
        (fret): fret is number => fret !== "muted" && fret > 0,
      );
      if (fretted.length > 0) {
        // Three frets is the reach the search works in. Four is allowed
        // only as the fallback for the altered chords that have nowhere
        // else to go, and never as a first choice.
        assert.ok(
          Math.max(...fretted) - Math.min(...fretted) <= 4,
          `${where} needs a wider hand`,
        );
      }

      const fingers = new Set(shape.fingers.filter((finger) => finger !== null));
      assert.ok(fingers.size <= 4, `${where} needs ${fingers.size} fingers`);

      // A string silenced in the middle of a chord is a different and
      // harder chord than the one the diagram draws.
      const played = shape.frets.map((fret) => fret !== "muted");
      const first = played.indexOf(true);
      const last = played.lastIndexOf(true);
      assert.ok(
        played.slice(first, last + 1).every(Boolean),
        `${where} mutes a string in the middle`,
      );
    }
  }
});

test("fingers are on the fretted strings and nowhere else", () => {
  for (const chord of everyChord()) {
    for (const shape of generateVoicings(chord, standard)) {
      shape.frets.forEach((fret, string) => {
        const finger = shape.fingers[string];
        if (typeof fret === "number" && fret > 0) {
          assert.ok(finger !== null, `${describe(shape.frets)} string ${6 - string}`);
        } else {
          assert.equal(finger, null, `${describe(shape.frets)} string ${6 - string}`);
        }
      });

      if (shape.barre) {
        // Everything under the barre is at its fret or above it, and no
        // string inside it is open — a finger cannot lie across one.
        for (let string = shape.barre.from; string <= shape.barre.to; string += 1) {
          const fret = shape.frets[string];
          if (fret === "muted") continue;
          assert.ok(fret >= shape.barre.fret, `${describe(shape.frets)} frets under its barre`);
        }
      }
    }
  }
});

test("open strings only ring while the hand is still near the nut", () => {
  for (const chord of everyChord()) {
    for (const shape of generateVoicings(chord, standard)) {
      if (!shape.frets.includes(0)) continue;
      const fretted = shape.frets.filter(
        (fret): fret is number => fret !== "muted" && fret > 0,
      );
      assert.ok(
        fretted.length === 0 || Math.max(...fretted) <= 5,
        `${chord.symbol} ${describe(shape.frets)} rings an open string from up the neck`,
      );
    }
  }
});

test("the positions offered are spread along the neck, not piled up", () => {
  for (const chord of everyChord()) {
    const found = generateVoicings(chord, standard);
    const byPosition = new Map<number, number>();
    for (const shape of found) {
      const fretted = shape.frets.filter(
        (fret): fret is number => fret !== "muted" && fret > 0,
      );
      const lowest = fretted.length === 0 ? 0 : Math.min(...fretted);
      byPosition.set(lowest, (byPosition.get(lowest) ?? 0) + 1);
    }
    for (const [lowest, count] of byPosition) {
      assert.ok(count <= 2, `${chord.symbol} offers ${count} shapes at fret ${lowest}`);
    }
  }
});

test("a slash chord stands on the note it names", () => {
  const strings = standard;

  // G/D: the chord's own fifth underneath, which is an inversion.
  const g = buildChord(rootFromPitchClass(7), "major", rootFromPitchClass(2));
  const gShapes = generateVoicings(g, strings);
  assert.ok(gShapes.length > 0, "G/D has no shapes");
  for (const shape of gShapes) {
    assert.equal(pitchClass(Math.min(...sounding(shape))), 2, describe(shape.frets));
  }

  // C/F: a bass from outside the chord, which is not an inversion at all.
  const c = buildChord(rootFromPitchClass(0), "major", rootFromPitchClass(5));
  const cShapes = generateVoicings(c, strings);
  assert.ok(cShapes.length > 0, "C/F has no shapes");
  for (const shape of cShapes) {
    const pitches = sounding(shape).map(pitchClass);
    assert.equal(pitches[0], 5, `${describe(shape.frets)} does not start on F`);
    // And the F appears only underneath: it is the bass, not a chord tone.
    assert.deepEqual(
      pitches.slice(1).filter((pitch) => pitch === 5),
      [],
      `${describe(shape.frets)} sounds the bass note twice`,
    );
  }
});

test("every chord can be stood on any of the twelve notes", () => {
  for (let bass = 0; bass < 12; bass += 1) {
    const chord = buildChord(rootFromPitchClass(0), "major", rootFromPitchClass(bass));
    const found = generateVoicings(chord, standard);
    assert.ok(found.length > 0, `nothing found for ${chord.symbol}`);
    for (const shape of found) {
      assert.equal(pitchClass(Math.min(...sounding(shape))), bass, chord.symbol);
    }
  }
});

test("the fingering is the one a hand would choose", () => {
  // Run on the chords whose fingering everybody already agrees on. If the
  // rule reproduces these it can be trusted on the ones nobody has played.
  assert.deepEqual(fingering([M, 3, 2, 0, 1, 0])!.fingers, [null, 3, 2, null, 1, null]);
  assert.deepEqual(fingering([M, 0, 2, 2, 2, 0])!.fingers, [null, null, 1, 2, 3, null]);

  const eShape = fingering([8, 10, 10, 9, 8, 8])!;
  assert.deepEqual(eShape.fingers, [1, 3, 4, 2, 1, 1], "the E shape barre");
  assert.deepEqual(eShape.barre, { fret: 8, from: 0, to: 5 });

  const aShape = fingering([M, 3, 5, 5, 5, 3])!;
  assert.deepEqual(aShape.fingers, [null, 1, 2, 3, 4, 1]);
  assert.deepEqual(aShape.barre, { fret: 3, from: 1, to: 5 });
});

test("a fifth finger is refused rather than invented", () => {
  // Five different frets, none of them shared, and no barre to save it.
  assert.equal(fingering([1, 2, 3, 4, 5, M]), null);
  // The same five strings under a barre are fine: the first finger takes
  // two of them.
  assert.ok(fingering([1, 2, 3, 4, 1, M]) !== null);
});

test("a finger cannot lie across a string that has to ring open", () => {
  const hand = fingering([3, 0, 3, M, M, M])!;
  assert.equal(hand.barre, undefined, "no barre over the open A string");
  assert.deepEqual(hand.fingers, [1, null, 2, null, null, null]);
});

const M = "muted" as const;

const describe = (frets: FretPosition[]) =>
  frets.map((fret) => (fret === "muted" ? "x" : fret)).join(" ");


test("the stretch is a last resort, not the house style", () => {
  // Four-fret shapes should be rare and confined to the chords that leave
  // no alternative. If this number climbs, the search has started reaching
  // when it did not have to.
  let stretched = 0;
  let total = 0;
  for (const chord of everyChord()) {
    for (const shape of generateVoicings(chord, standard)) {
      const fretted = shape.frets.filter(
        (fret): fret is number => fret !== "muted" && fret > 0,
      );
      total += 1;
      if (fretted.length > 0 && Math.max(...fretted) - Math.min(...fretted) > 3) {
        stretched += 1;
      }
    }
  }
  assert.ok(stretched / total < 0.05, `${stretched} of ${total} voicings stretch`);
});

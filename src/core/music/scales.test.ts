import test from "node:test";
import assert from "node:assert/strict";

import { rootFromPitchClass, rootName } from "./chords.ts";
import { formatNote, midiOf, parseNote } from "./notes.ts";
import {
  SCALES,
  SCALE_NAMES,
  diatonicChords,
  notesOutside,
  parentMajor,
  scaleAlterations,
  scaleDegrees,
  scaleNotes,
  scaleRoot,
  scaleRootChoice,
  scaleTitle,
} from "./scales.ts";
import type { ScaleName } from "./scales.ts";

const spell = (tonic: string, scale: ScaleName) =>
  scaleNotes(parseNote(tonic), scale).map(rootName).join(" ");

const harmony = (tonic: string, scale: ScaleName) =>
  diatonicChords(parseNote(tonic), scale)
    .map((entry) => `${entry.numeral}:${entry.chord.symbol}`)
    .join(" ");

const ALL_KEYS = ["C4", "Db4", "D4", "Eb4", "E4", "F4", "F#4", "G4", "Ab4", "A4", "Bb4", "B4"];

test("scales use each letter once", () => {
  assert.equal(spell("C4", "major"), "C D E F G A B");
  assert.equal(spell("G4", "major"), "G A B C D E F♯");
  assert.equal(spell("F4", "major"), "F G A B♭ C D E");
  assert.equal(spell("A4", "minor"), "A B C D E F G");
  assert.equal(spell("E4", "minor"), "E F♯ G A B C D");
});

test("no scale repeats or skips a letter, in any key", () => {
  // The property that letter-stepping buys. Spell by pitch instead and G
  // major's seventh becomes G♭ — two Gs in the scale, and no key signature.
  for (const tonic of ALL_KEYS) {
    for (const scale of SCALE_NAMES) {
      const letters = scaleNotes(parseNote(tonic), scale).map((note) => note.letter);
      assert.equal(new Set(letters).size, 7, `${tonic} ${scale}: ${letters.join("")}`);
    }
  }
});

test("a major key is always I ii iii IV V vi vii°", () => {
  assert.equal(
    harmony("C4", "major"),
    "I:C ii:Dm iii:Em IV:F V:G vi:Am vii°:Bdim",
  );
  // Same pattern, different key — which is the point of numerals.
  assert.equal(
    harmony("G4", "major"),
    "I:G ii:Am iii:Bm IV:C V:D vi:Em vii°:F♯dim",
  );
});

test("a minor key is i ii° III iv v VI VII", () => {
  assert.equal(
    harmony("A4", "minor"),
    "i:Am ii°:Bdim III:C iv:Dm v:Em VI:F VII:G",
  );
});

test("a minor key holds the same chords as its relative major", () => {
  // Why A minor and C major feel interchangeable: they are the same seven
  // chords, started three degrees apart.
  const major = diatonicChords(parseNote("C4"), "major").map((e) => e.chord.symbol);
  const minor = diatonicChords(parseNote("A4"), "minor").map((e) => e.chord.symbol);
  assert.deepEqual([...minor].sort(), [...major].sort());
});

test("the qualities follow the same pattern in every key", () => {
  for (const tonic of ALL_KEYS) {
    const qualities = diatonicChords(parseNote(tonic), "major").map(
      (entry) => entry.chord.quality,
    );
    assert.deepEqual(
      qualities,
      ["major", "minor", "minor", "major", "major", "minor", "diminished"],
      `${tonic} major`,
    );
  }
});

test("the diminished chord really is diminished", () => {
  const seventh = diatonicChords(parseNote("C4"), "major")[6].chord;
  // Written "dim" as a chord chart writes it. The ring is the scale row's
  // own rendering of the numeral, not the chord's name.
  assert.equal(seventh.symbol, "Bdim");
  assert.deepEqual(seventh.tones.map((tone) => rootName(tone.note)), ["B", "D", "F"]);
  assert.deepEqual(seventh.tones.map((tone) => tone.degree), ["1", "♭3", "♭5"]);
});

test("every chord in a key is built only from that key's notes", () => {
  for (const tonic of ALL_KEYS) {
    for (const scale of SCALE_NAMES) {
      const notes = new Set(
        scaleNotes(parseNote(tonic), scale).map((note) => formatNote(note).replace(/\d+$/, "")),
      );
      for (const entry of diatonicChords(parseNote(tonic), scale)) {
        for (const tone of entry.chord.tones) {
          const name = formatNote(tone.note).replace(/\d+$/, "");
          assert.ok(
            notes.has(name),
            `${tonic} ${scale}: ${entry.chord.symbol} uses ${name}, not in the scale`,
          );
        }
      }
    }
  }
});

test("each mode is the major scale started somewhere else", () => {
  // The relative view: same seven notes, different home. C major's notes,
  // read from D, are D Dorian — and so on round the seven.
  const parent = scaleNotes(parseNote("C4"), "major").map(rootName);
  const starts: Array<[ScaleName, string]> = [
    ["major", "C4"],
    ["dorian", "D4"],
    ["phrygian", "E4"],
    ["lydian", "F4"],
    ["mixolydian", "G4"],
    ["minor", "A4"],
    ["locrian", "B4"],
  ];
  for (const [scale, tonic] of starts) {
    assert.deepEqual(
      [...scaleNotes(parseNote(tonic), scale).map(rootName)].sort(),
      [...parent].sort(),
      `${tonic} ${scale}`,
    );
  }
});

test("each mode is its parallel major or minor with one degree moved", () => {
  // The parallel view, which is the one that explains the sound. Everything
  // here is stated against the same tonic, so the single changed note is the
  // whole difference.
  assert.equal(spell("D4", "dorian"), "D E F G A B C");       // minor, ♮6
  assert.equal(spell("D4", "minor"), "D E F G A B♭ C");
  assert.equal(spell("E4", "phrygian"), "E F G A B C D");      // minor, ♭2
  assert.equal(spell("F4", "lydian"), "F G A B C D E");        // major, ♯4
  assert.equal(spell("F4", "major"), "F G A B♭ C D E");
  assert.equal(spell("G4", "mixolydian"), "G A B C D E F");    // major, ♭7
  assert.equal(spell("B4", "locrian"), "B C D E F G A");       // minor, ♭2 ♭5
});

test("harmonic and melodic minor raise what the key signature does not", () => {
  assert.equal(spell("A4", "minor"), "A B C D E F G");
  assert.equal(spell("A4", "harmonic-minor"), "A B C D E F G♯");
  assert.equal(spell("A4", "melodic-minor"), "A B C D E F♯ G♯");
});

test("the raised 7th gives harmonic minor a major V and an augmented III", () => {
  // The reason the scale exists: natural minor's v is minor and does not pull
  // home. Raise the 7th and E7's G♯ leans on the A. The III+ is what that
  // raised note does to the chord three degrees below it, and it is the only
  // chord in the whole vocabulary that the seven modes never produce.
  assert.equal(
    harmony("A4", "harmonic-minor"),
    "i:Am ii°:Bdim III+:Caug iv:Dm V:E VI:F vii°:G♯dim",
  );
  assert.equal(
    harmony("A4", "melodic-minor"),
    "i:Am ii:Bm III+:Caug IV:D V:E vi°:F♯dim vii°:G♯dim",
  );
});

test("the augmented chord really is augmented", () => {
  const third = diatonicChords(parseNote("A4"), "harmonic-minor")[2].chord;
  assert.equal(third.quality, "augmented");
  assert.deepEqual(third.tones.map((tone) => rootName(tone.note)), ["C", "E", "G♯"]);
  assert.deepEqual(third.tones.map((tone) => tone.degree), ["1", "3", "♯5"]);
});

test("every mode's chords are the parent key's, rotated", () => {
  // Same claim as "A minor holds C major's chords", made for all seven. If a
  // mode's harmony were anything else, the relative relationship would be a
  // coincidence rather than a consequence.
  const parent = diatonicChords(parseNote("C4"), "major").map((e) => e.chord.symbol).sort();
  const starts: Array<[ScaleName, string]> = [
    ["dorian", "D4"],
    ["phrygian", "E4"],
    ["lydian", "F4"],
    ["mixolydian", "G4"],
    ["minor", "A4"],
    ["locrian", "B4"],
  ];
  for (const [scale, tonic] of starts) {
    assert.deepEqual(
      diatonicChords(parseNote(tonic), scale).map((e) => e.chord.symbol).sort(),
      parent,
      `${tonic} ${scale}`,
    );
  }
});

test("no scale on any root needs a double accidental", () => {
  // The guarantee the root-spelling rule exists to give. D♭ Phrygian spells
  // out as D♭ E𝄫 F♭ G♭ A♭ B𝄫 C♭ — legal, and unreadable; picking C♯ instead
  // costs nothing and is what a chart would write.
  for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
    for (const scale of SCALE_NAMES) {
      const notes = scaleNotes(scaleRoot(pitchClass, scale), scale);
      for (const note of notes) {
        assert.ok(
          Math.abs(note.accidental) < 2,
          `${scale} on pitch class ${pitchClass}: ${notes.map(rootName).join(" ")}`,
        );
      }
    }
  }
});

test("the root-spelling rule reproduces the conventional key names", () => {
  // Counting accidentals is not a second opinion about what keys are called —
  // for all twenty-four it agrees with the hand-written table in chords.ts,
  // F♯ major and E♭ minor included, both of which are ties.
  for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
    for (const scale of ["major", "minor"] as const) {
      assert.equal(
        rootName(scaleRoot(pitchClass, scale)),
        rootName(rootFromPitchClass(pitchClass, 4, "conventional", scale)),
        `${scale} on pitch class ${pitchClass}`,
      );
    }
  }
});

test("the root-spelling rule picks the names charts actually use", () => {
  assert.equal(rootName(scaleRoot(1, "phrygian")), "C♯");  // not D♭, which needs two double flats
  assert.equal(rootName(scaleRoot(6, "lydian")), "G♭");    // not F♯, which would need an E♯ and a B♯
  assert.equal(rootName(scaleRoot(3, "minor")), "E♭");     // a tie, settled the way minor keys are named
  assert.equal(rootName(scaleRoot(6, "major")), "F♯");     // the same tie, settled the other way
  assert.equal(rootName(scaleRoot(10, "phrygian")), "B♭"); // a tie: B♭ Phrygian, not A♯
});

test("every scale has seven steps and a hint", () => {
  // `scaleNotes` walks the seven letters, so a scale of any other length
  // would silently spell two degrees with the same letter. Pentatonics need
  // a different representation, not another row here.
  for (const scale of SCALE_NAMES) {
    assert.equal(SCALES[scale].steps.length, 7, scale);
    assert.equal(SCALES[scale].steps[0], 0, `${scale} must start on its tonic`);
    assert.ok(SCALES[scale].hint.length > 0, scale);
  }
});

test("degrees are named against the major scale", () => {
  assert.deepEqual(scaleDegrees("major"), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(scaleDegrees("minor"), ["1", "2", "♭3", "4", "5", "♭6", "♭7"]);
  assert.deepEqual(scaleDegrees("dorian"), ["1", "2", "♭3", "4", "5", "6", "♭7"]);
  assert.deepEqual(scaleDegrees("lydian"), ["1", "2", "3", "♯4", "5", "6", "7"]);
  assert.deepEqual(scaleDegrees("locrian"), ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"]);
  assert.deepEqual(scaleDegrees("melodic-minor"), ["1", "2", "♭3", "4", "5", "6", "7"]);
});

test("no degree is ever more than a semitone from the major scale's", () => {
  // What lets every degree be written with a single ♭ or ♯. A scale that
  // moved one by two semitones would need "♭♭3", and the labels would start
  // lying rather than fail.
  for (const scale of SCALE_NAMES) {
    for (const degree of scaleDegrees(scale)) {
      assert.match(degree, /^[♭♯]?[1-7]$/, `${scale}: ${degree}`);
    }
  }
});

test("each mode is one changed degree against its parallel major or minor", () => {
  // The claim the browser makes in words. Dorian is not seven intervals, it
  // is minor with a raised 6th, and the third is what decides which of the
  // two it gets measured against.
  const one = (scale: ScaleName) => {
    const { against, changes } = scaleAlterations(scale);
    return `${against} ${changes.map((c) => `${c.direction} ${c.parentDegree}→${c.degree}`).join(", ")}`;
  };
  assert.equal(one("dorian"), "minor raised ♭6→6");
  assert.equal(one("phrygian"), "minor lowered 2→♭2");
  assert.equal(one("lydian"), "major raised 4→♯4");
  assert.equal(one("mixolydian"), "major lowered 7→♭7");
  assert.equal(one("locrian"), "minor lowered 2→♭2, lowered 5→♭5");
  assert.equal(one("harmonic-minor"), "minor raised ♭7→7");
  assert.equal(one("melodic-minor"), "minor raised ♭6→6, raised ♭7→7");
  // The two a scale is measured against change nothing about themselves.
  assert.deepEqual(scaleAlterations("major").changes, []);
  assert.deepEqual(scaleAlterations("minor").changes, []);
});

test("a mode's parent major holds exactly its notes", () => {
  // Stated as the relationship rather than as a lookup: whatever note
  // `parentMajor` returns, the major scale on it must be this same set.
  for (const tonic of ALL_KEYS) {
    for (const scale of SCALE_NAMES) {
      const root = scaleRoot(((9 + ALL_KEYS.indexOf(tonic)) % 12), scale);
      const parent = parentMajor(root, scale);
      if (SCALES[scale].modeOf === null) {
        assert.equal(parent, null, scale);
        continue;
      }
      assert.ok(parent);
      assert.deepEqual(
        scaleNotes(parent, "major").map(rootName).sort(),
        scaleNotes(root, scale).map(rootName).sort(),
        `${rootName(root)} ${scale} vs ${rootName(parent)} major`,
      );
    }
  }
});

test("harmonic and melodic minor are modes of nothing", () => {
  // Not an oversight in the table. No major scale contains A minor's notes
  // and a G♯, which is the whole reason these two sound like neither of the
  // scales they sit between.
  assert.equal(parentMajor(parseNote("A4"), "harmonic-minor"), null);
  assert.equal(parentMajor(parseNote("A4"), "melodic-minor"), null);
  assert.equal(rootName(parentMajor(parseNote("D4"), "dorian")!), "C");
  assert.equal(rootName(parentMajor(parseNote("E4"), "phrygian")!), "C");
  assert.equal(rootName(parentMajor(parseNote("C4"), "major")!), "C");
});

test("the root choice can show the name it turned down", () => {
  const phrygian = scaleRootChoice(1, "phrygian");
  assert.equal(rootName(phrygian.chosen), "C♯");
  assert.equal(rootName(phrygian.rejected!), "D♭");
  assert.ok(
    phrygian.rejectedCost > phrygian.chosenCost,
    "D♭ Phrygian must cost more, or the browser's explanation is wrong",
  );

  // A tie is a real thing and must report as one, not as a win.
  const major = scaleRootChoice(6, "major");
  assert.equal(rootName(major.chosen), "F♯");
  assert.equal(rootName(major.rejected!), "G♭");
  assert.equal(major.chosenCost, major.rejectedCost);

  // A white key has only one name worth the argument.
  assert.equal(scaleRootChoice(0, "major").rejected, null);
});

test("the five notes outside a scale are spelled like the scale", () => {
  // Returned climbing from the tonic, like the scale itself. They are the
  // outlined dots on the neck, and they follow the scale's own
  // direction rather than a fixed preference: F minor must not show an F♯
  // beside its own G♭.
  assert.deepEqual(
    notesOutside(parseNote("C4"), "major").map(rootName),
    ["C♯", "D♯", "F♯", "G♯", "A♯"],
  );
  assert.deepEqual(
    notesOutside(parseNote("C#4"), "phrygian").map(rootName),
    ["D♯", "F", "G", "A♯", "C"],
  );
  assert.deepEqual(
    notesOutside(parseNote("F4"), "minor").map(rootName),
    ["G♭", "A", "B", "D", "E"],
  );
  for (const scale of SCALE_NAMES) {
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      const tonic = scaleRoot(pitchClass, scale);
      const outside = notesOutside(tonic, scale);
      assert.equal(outside.length, 5, `${rootName(tonic)} ${scale}`);
      // Seven in, five out, and no pitch counted twice.
      const all = new Set([
        ...scaleNotes(tonic, scale).map((n) => ((midiOf(n) % 12) + 12) % 12),
        ...outside.map((n) => ((midiOf(n) % 12) + 12) % 12),
      ]);
      assert.equal(all.size, 12, `${rootName(tonic)} ${scale}`);
    }
  }
});

test("no scale raises one degree and lowers another", () => {
  // The browser says "with the 6th and 7th both raised" — one direction for
  // the whole list. Locrian lowers twice and melodic minor raises twice, and
  // nothing here mixes. A scale that did would need the sentence rewritten,
  // so this fails rather than letting it read wrong.
  for (const scale of SCALE_NAMES) {
    const directions = new Set(scaleAlterations(scale).changes.map((c) => c.direction));
    assert.ok(directions.size <= 1, `${scale}: ${[...directions].join(" and ")}`);
  }
});

test("modes keep their capital, major and minor do not", () => {
  // Three components print this string and none of them may disagree. The
  // capitals are not decoration: Dorian is named after a place, major is a
  // description of a third.
  assert.equal(scaleTitle(parseNote("C4"), "major"), "C major");
  assert.equal(scaleTitle(parseNote("A4"), "minor"), "A minor");
  assert.equal(scaleTitle(parseNote("D4"), "dorian"), "D Dorian");
  assert.equal(scaleTitle(parseNote("F4"), "lydian"), "F Lydian");
  assert.equal(scaleTitle(parseNote("A4"), "harmonic-minor"), "A harmonic minor");
  assert.equal(scaleTitle(parseNote("C#4"), "melodic-minor"), "C♯ melodic minor");
});

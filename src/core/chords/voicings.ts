/**
 * Finding shapes instead of typing them.
 *
 * Fifty qualities in twelve keys is six hundred chords, and each wants
 * several positions on the neck. Hand-writing that is not an option — not
 * for the labour, but because a hand-typed list of ten thousand fingerings
 * is a list of ten thousand chances to be silently wrong, and a chord book
 * that lies is worse than one that is short.
 *
 * So this searches. Given a chord and a tuning it walks the neck a hand's
 * width at a time, tries every combination of frets that sounds only notes
 * of the chord, throws out the ones a hand cannot hold, and ranks what is
 * left. The hand-written shapes in `shapes.ts` and `movable.ts` stay: a
 * search does not know that x32010 is *the* C major, and open chords are
 * what people actually learn. This fills in everything after that.
 *
 * Pure, like the rest of `core` — a chord and a tuning in, shapes out — so
 * it can be tested against the whole vocabulary at once, which is the only
 * way to trust six hundred chords.
 */

import { essentialTones, tonesByImportance } from "../music/chords.ts";
import type { Chord } from "../music/chords.ts";
import { midiOf } from "../music/notes.ts";
import type { Note } from "../music/types.ts";
import type { ChordShape, Finger, FretPosition } from "./shapes.ts";

/** Highest fret a voicing may reach. Past this the frets are tiny. */
const MAX_FRET = 14;

/** Frets between the lowest and highest fretted note. One hand's reach. */
const SPAN = 3;

/** Fewer strings than this and it is an interval, not a chord. */
const MIN_SOUNDING = 3;

/**
 * How far up the neck a shape may go and still ring an open string.
 *
 * Without this the search happily proposes 8-0-7-8-7-8: every note is in
 * the chord and the hand can hold it, but no one has ever played it. An
 * open string is the nut acting as a finger, and it only sounds like part
 * of the chord while the hand is still near the nut.
 */
const OPEN_REACH = 5;

const pitchClassOf = (value: number) => ((value % 12) + 12) % 12;

export interface VoicingOptions {
  maxFret?: number;
  span?: number;
  /** Most shapes to return. They are thinned along the neck, not truncated. */
  limit?: number;
}

/**
 * Work out a fingering for a set of frets, or decide there is none.
 *
 * The rule a hand follows: the first finger lies flat across the lowest
 * fret if more than one string needs it, and the others land in order going
 * up the neck. That is not a heuristic dressed up as one — run it on
 * x32010 and it produces the fingering everybody uses for C, and on the E
 * shape barre it produces 1-3-4-2-1-1.
 *
 * Returns null when it would take a fifth finger.
 */
export function fingering(
  frets: FretPosition[],
): { fingers: Finger[]; barre?: { fret: number; from: number; to: number } } | null {
  const fretted = frets
    .map((fret, string) => ({ fret, string }))
    .filter((entry): entry is { fret: number; string: number } =>
      entry.fret !== "muted" && entry.fret > 0,
    );

  const fingers: Finger[] = frets.map(() => null);
  if (fretted.length === 0) return { fingers };

  const lowest = Math.min(...fretted.map((entry) => entry.fret));
  const atLowest = fretted.filter((entry) => entry.fret === lowest);

  let barre: { fret: number; from: number; to: number } | undefined;
  if (atLowest.length > 1) {
    const from = atLowest[0].string;
    const to = atLowest[atLowest.length - 1].string;
    /*
     * Two things stop a finger lying flat. One is an open string inside the
     * run, which it would silence. The other is a sounding string past the
     * far end: a finger does not stop where the chord wants it to, and the
     * extra length lands on whatever comes next. That second rule is why
     * nobody barres the open A chord — x02220 has three strings at the same
     * fret and is still fingered 1-2-3, because the high E has to ring.
     */
    const blocked =
      frets.slice(from, to + 1).some((fret) => fret === 0) ||
      frets.slice(to + 1).some((fret) => fret !== "muted");
    if (!blocked) barre = { fret: lowest, from, to };
  }

  let next = 1;
  if (barre) {
    for (const entry of atLowest) fingers[entry.string] = 1;
    next = 2;
  }

  const remaining = fretted
    .filter((entry) => !(barre && entry.fret === lowest))
    .sort((a, b) => a.fret - b.fret || a.string - b.string);

  for (const entry of remaining) {
    if (next > 4) return null;
    fingers[entry.string] = next as Finger;
    next += 1;
  }

  return { fingers, barre };
}

interface Candidate {
  frets: FretPosition[];
  fingers: Finger[];
  barre?: { fret: number; from: number; to: number };
  lowest: number;
  sounding: number;
  /** How many of the chord's own notes it sounds, counting each once. */
  covered: number;
  fingersUsed: number;
  span: number;
  open: boolean;
}

/**
 * Every shape for a chord that a hand can hold, best first.
 *
 * "Best" is: as many of the chord's notes as it can sound, on as many
 * strings, with as few fingers and as little stretch. Ties go to the one
 * nearer the nut.
 */
export function generateVoicings(
  chord: Chord,
  strings: Note[],
  options: VoicingOptions = {},
): ChordShape[] {
  const maxFret = options.maxFret ?? MAX_FRET;
  const span = options.span ?? SPAN;
  const limit = options.limit ?? 8;

  const openPitch = strings.map((note) => pitchClassOf(midiOf(note)));
  const chordPitches = new Set(chord.tones.map((tone) => pitchClassOf(midiOf(tone.note))));
  const bassPitch = pitchClassOf(midiOf(chord.bass ?? chord.root));

  /*
   * Which notes the shape has to sound. Start from what the chord cannot do
   * without and give ground one note at a time if nothing fits — a
   * thirteenth chord has seven notes and a hand has four fingers, so a
   * search that refuses to compromise returns nothing at all.
   */
  const giveUpOrder = tonesByImportance(chord).map((tone) =>
    pitchClassOf(midiOf(tone.note)),
  );
  let required = essentialTones(chord).map((tone) => pitchClassOf(midiOf(tone.note)));

  const look = (needed: number[], reach: number) =>
    search(new Set(needed), {
      strings,
      openPitch,
      chordPitches,
      bassPitch,
      maxFret,
      span: reach,
    });

  let found: Candidate[] = [];
  for (let attempt = 0; attempt < giveUpOrder.length; attempt += 1) {
    found = look(required, span);
    if (found.length > 0) break;
    const drop = giveUpOrder[attempt];
    required = required.filter((pitch) => pitch !== drop);
    if (required.length < 2) break;
  }

  /*
   * The altered dominants are the chords with the fewest places to go — a
   * 7(♯5,♭9) has five notes that all have to be there, and in some keys
   * exactly one shape inside a three-fret reach holds them. Rather than
   * offer one position, or drop the alteration that is the whole reason
   * for the chord, let the hand stretch a fret further. A four-fret span
   * is a real thing to play; it is only the second choice.
   */
  if (found.length < 2) {
    const stretched = look(required, span + 1);
    const seen = new Set(found.map((candidate) => candidate.frets.join()));
    found = [...found, ...stretched.filter((c) => !seen.has(c.frets.join()))];
  }

  return thin(found, limit).map((candidate) => shapeOf(chord, candidate));
}

interface SearchContext {
  strings: Note[];
  openPitch: number[];
  chordPitches: Set<number>;
  bassPitch: number;
  maxFret: number;
  span: number;
}

/**
 * Walk the neck, a window at a time, collecting everything playable.
 *
 * The window is what keeps this finite and what keeps it honest: every fret
 * in a voicing has to sit inside one hand's reach, so the search is over
 * hand positions rather than over the whole fretboard at once. Open strings
 * are allowed alongside any of them, because the nut is a finger you always
 * have.
 */
function search(required: Set<number>, context: SearchContext): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (let window = 1; window <= context.maxFret - context.span; window += 1) {
    walk(window, required, context, seen, out);
  }
  return out;
}

function walk(
  window: number,
  required: Set<number>,
  context: SearchContext,
  seen: Set<string>,
  out: Candidate[],
) {
  const { openPitch, chordPitches, bassPitch, span } = context;
  const strings = openPitch.length;
  const frets: FretPosition[] = new Array(strings).fill("muted");

  /*
   * Depth-first over the strings, with the rules applied as it goes rather
   * than at the end. Pruning is what makes this cheap: a branch that has
   * already muted a string in the middle of the chord, or put the wrong
   * note in the bass, is abandoned before its six-string descendants are
   * ever enumerated.
   */
  const recurse = (
    string: number,
    started: boolean,
    stopped: boolean,
    lowFret: number,
    highFret: number,
  ) => {
    if (string === strings) {
      if (!started) return;
      finish(frets, required, context, seen, out);
      return;
    }

    // Mute it. Muting after the chord has started means it has ended.
    frets[string] = "muted";
    recurse(string + 1, started, started, lowFret, highFret);

    // Sounding strings have to be next to each other: a gap in the middle
    // is a string the hand has to actively silence, which is a different
    // (and harder) chord than the one being drawn.
    if (stopped) return;

    for (const fret of [0, ...range(window, window + span)]) {
      if (fret > context.maxFret) continue;
      const pitch = pitchClassOf(openPitch[string] + fret);

      if (!started) {
        // The lowest string that sounds decides the bass, and a slash
        // chord's bass may be a note from outside the chord entirely.
        if (pitch !== bassPitch) continue;
      } else if (!chordPitches.has(pitch)) {
        continue;
      }

      const low = fret > 0 ? Math.min(lowFret, fret) : lowFret;
      const high = fret > 0 ? Math.max(highFret, fret) : highFret;
      if (high - low > span) continue;

      frets[string] = fret;
      recurse(string + 1, true, false, low, high);
      frets[string] = "muted";
    }
  };

  recurse(0, false, false, Infinity, -Infinity);
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

function finish(
  frets: FretPosition[],
  required: Set<number>,
  context: SearchContext,
  seen: Set<string>,
  out: Candidate[],
) {
  const sounding = frets.filter((fret) => fret !== "muted").length;
  if (sounding < MIN_SOUNDING) return;

  const fretted = frets.filter(
    (fret): fret is number => fret !== "muted" && fret > 0,
  );
  const highest = fretted.length === 0 ? 0 : Math.max(...fretted);
  if (frets.includes(0) && highest > OPEN_REACH) return;

  const key = frets.join(",");
  if (seen.has(key)) return;

  const pitches = new Set<number>();
  let deepest = Infinity;
  frets.forEach((fret, string) => {
    if (fret === "muted") return;
    pitches.add(pitchClassOf(context.openPitch[string] + fret));
    // Sounding pitch, not string order. The B string is tuned a third
    // above the G rather than a fourth, so a note high up the G string
    // can sit below an open B — and the bass is whatever is lowest by ear.
    deepest = Math.min(deepest, midiOf(context.strings[string]) + fret);
  });
  if (pitchClassOf(deepest) !== context.bassPitch) return;
  for (const pitch of required) if (!pitches.has(pitch)) return;

  const hand = fingering(frets);
  if (hand === null) return;

  seen.add(key);

  out.push({
    frets: [...frets],
    fingers: hand.fingers,
    barre: hand.barre,
    lowest: fretted.length === 0 ? 0 : Math.min(...fretted),
    sounding,
    covered: [...pitches].filter((pitch) => context.chordPitches.has(pitch)).length,
    fingersUsed: new Set(hand.fingers.filter((finger) => finger !== null)).size,
    span: fretted.length === 0 ? 0 : highest - Math.min(...fretted),
    open: frets.includes(0),
  });
}

/**
 * Thin a few thousand playable shapes down to a handful worth showing.
 *
 * Almost all of them are the same voicing with one note moved an octave, so
 * the useful axis is position on the neck: keep the best one or two at each
 * hand position and drop the rest. A list of forty C13s is not a richer
 * chord book than a list of six, it is an unusable one.
 */
function thin(candidates: Candidate[], limit: number): Candidate[] {
  const better = (a: Candidate, b: Candidate) =>
    b.covered - a.covered ||
    b.sounding - a.sounding ||
    a.fingersUsed - b.fingersUsed ||
    a.span - b.span ||
    // A barre that starts on the lowest string it sounds is the shape a
    // book prints; one tucked under the other fingers is playable but is
    // the second choice.
    Number(tucked(a)) - Number(tucked(b)) ||
    a.lowest - b.lowest ||
    a.frets.join().localeCompare(b.frets.join());

  const byPosition = new Map<number, Candidate[]>();
  for (const candidate of [...candidates].sort(better)) {
    const position = candidate.lowest;
    const kept = byPosition.get(position) ?? [];
    if (kept.length >= 2) continue;
    // The second slot at a position should be a different chord, not the
    // same one with a string dropped off the end.
    if (kept.some((other) => contains(other, candidate))) continue;
    byPosition.set(position, [...kept, candidate]);
  }

  const positions = [...byPosition.keys()].sort((a, b) => a - b);
  const out: Candidate[] = [];
  // One per position first, so the list spans the neck before it doubles up.
  for (const pass of [0, 1]) {
    for (const position of positions) {
      const candidate = byPosition.get(position)![pass];
      if (candidate && out.length < limit) out.push(candidate);
    }
  }
  return out.sort((a, b) => a.lowest - b.lowest || better(a, b));
}

/** Whether the barre sits under other fretted strings rather than across all. */
function tucked(candidate: Candidate): boolean {
  if (!candidate.barre) return false;
  return candidate.frets.some(
    (fret, string) => string < candidate.barre!.from && fret !== "muted",
  );
}

/** Whether `inner` is `outer` with strings taken away and nothing moved. */
function contains(outer: Candidate, inner: Candidate): boolean {
  return inner.frets.every(
    (fret, string) => fret === "muted" || fret === outer.frets[string],
  );
}

function shapeOf(chord: Chord, candidate: Candidate): ChordShape {
  return {
    id: `found-${candidate.frets.join("-")}`,
    name: nameFor(candidate),
    rootPitchClass: pitchClassOf(midiOf(chord.root)),
    quality: chord.quality,
    frets: candidate.frets,
    fingers: candidate.fingers,
    barre: candidate.barre,
  };
}

function nameFor(candidate: Candidate): string {
  // An open string on its own does not make an open-position chord: the
  // name should say where the hand is, and x-3-0-3-5-5 is at the 3rd fret
  // with one string left ringing.
  if (candidate.open && candidate.lowest <= 2) return "Open position";
  return `${candidate.lowest}${ordinal(candidate.lowest)} fret`;
}

export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

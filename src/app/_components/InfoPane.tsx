"use client";

/**
 * The pane beside the diagram.
 *
 * Always rendered, whether or not Pro is on, so that turning Pro on fills it
 * rather than reflowing the page — the diagram must not move under someone
 * who is reading it. With Pro off it still earns its place by naming the
 * chord's notes; with Pro on it explains them.
 *
 * That explanation is the part of the chord library nobody else does. A
 * diagram tells you where to put your fingers; this tells you what comes out
 * and why. Written for someone who does not already know the theory, so
 * every line says the thing rather than naming it.
 */

import { chordSize, isRespelled, respell, rootName } from "@/core/music/chords.ts";
import type { Chord, ChordQuality, RootSpelling } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";
import type { ShapeAnalysis } from "@/core/chords/analysis.ts";

const COUNT_WORDS = ["never", "once", "twice", "three times", "four times", "five times", "six times"];

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/**
 * What each quality is, in a sentence, for someone who does not already
 * know. `notes` is the chord spelled the way the reader has asked to see it.
 *
 * Written to say the thing rather than name it: "the third steps aside" and
 * not "the third is suspended", because the second sentence only helps a
 * reader who could have written it themselves.
 */
function explain(quality: ChordQuality, notes: string[], degrees: string[]): string {
  const written = EXPLANATIONS[quality];
  if (written) return written(notes);

  /*
   * Everything else gets its recipe read back in words. Less illuminating
   * than a sentence written for it, but true of all fifty qualities and
   * never wrong — and for a chord like maj13♯11 the recipe genuinely is
   * the explanation.
   */
  const words = degrees.map(degreeWord);
  const last = words.pop();
  return (
    `${capitalise(words.join(", "))} and ${last}, stacked on ${notes[0]}: ` +
    `${notes.join(", ")}.`
  );
}

/** Whether a note is one the chord already sounds, by pitch rather than name. */
function inChord(chord: Chord, note: Note): boolean {
  const pitchClass = (value: number) => ((value % 12) + 12) % 12;
  return chord.tones.some(
    (tone) => pitchClass(midiOf(tone.note)) === pitchClass(midiOf(note)),
  );
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The qualities worth a sentence of their own, written for someone who does
 * not already know the theory. Each says the thing rather than naming it —
 * "the third steps aside" and not "the third is suspended", because the
 * second sentence only helps a reader who could have written it themselves.
 */
const EXPLANATIONS: Partial<Record<ChordQuality, (notes: string[]) => string>> = {
  major: (n) => `A major chord is the 1st, 3rd and 5th notes of its scale — ${n.join(", ")}.`,
  minor: (n) =>
    `A minor chord is a major one with its middle note lowered by a semitone: ` +
    `${n.join(", ")}. The ${n[1]} sits one fret under where ${n[0]} major would ` +
    `put it, and that one fret is the whole difference.`,
  power: (n) =>
    `Only the root and the fifth — ${n.join(" and ")}. The third is what decides ` +
    `between major and minor, and this chord does not have one, which is why it ` +
    `sits over either.`,
  sus2: (n) =>
    `Suspended. The third steps down to the note below it, the 2nd of the scale: ` +
    `${n.join(", ")}. With no third there is nothing to say major or minor, so it ` +
    `hangs unresolved until one arrives.`,
  sus4: (n) =>
    `Suspended. The third steps up to the note above it, the 4th of the scale: ` +
    `${n.join(", ")}. With no third there is nothing to say major or minor, so it ` +
    `hangs unresolved until one arrives.`,
  dominant7: (n) =>
    `A major chord with the 7th of the scale added and flattened a semitone — ` +
    `${n.join(", ")}. That flattened seventh is the note that sounds unfinished, ` +
    `and it is why a 7th chord pulls somewhere else.`,
  major7: (n) =>
    `A major chord with the 7th of the scale added as it stands, unflattened — ` +
    `${n.join(", ")}. It lands a semitone under the root, which is where the ` +
    `softness comes from.`,
  minor7: (n) =>
    `A minor chord with a flattened seventh on top — ${n.join(", ")}. The same ` +
    `seventh a dominant chord uses, over a minor third instead of a major one.`,
  add9: (n) =>
    `A plain major chord with the 9th added and no seventh under it — which is ` +
    `all "add" means. The 9th is the 2nd of the scale an octave up: ${n.join(", ")}.`,
  dominant9: (n) =>
    `A 7th chord that keeps stacking: ${n.join(", ")}. Five notes and six strings ` +
    `is a tight fit, so guitarists drop the fifth — it is the one note the chord ` +
    `does not miss.`,
  dominant7sharp9: (n) =>
    `A 7th chord with the 9th raised a semitone. The raised ninth sounds the same ` +
    `as a minor third, so this chord holds a major and a minor third at once — ` +
    `${n[1]} and ${n[4]} over the same ${n[0]} — and the argument between them is ` +
    `the whole sound.`,
  diminished: (n) =>
    `A minor chord with the fifth flattened too: ${n.join(", ")}. Two minor thirds ` +
    `stacked, which leaves it with no stable note to sit on — it always sounds ` +
    `like it is on the way somewhere.`,
  diminished7: (n) =>
    `Three minor thirds stacked: ${n.join(", ")}. Every gap in it is the same ` +
    `size, so it has no root to speak of — the same four notes make a diminished ` +
    `7th on any of them, and the shape repeats every three frets.`,
  augmented: (n) =>
    `A major chord with the fifth raised instead of flattened: ${n.join(", ")}. ` +
    `Two major thirds stacked, and like the diminished 7th it is symmetrical — ` +
    `the same shape four frets up is the same chord again.`,
  sixth: (n) =>
    `A major chord with the 6th of the scale added — ${n.join(", ")}. Not a ` +
    `seventh: the 6th is a whole tone lower, and it settles rather than pulls.`,
  minor6: (n) =>
    `A minor chord with the 6th of the scale added, unflattened — ${n.join(", ")}. ` +
    `The major 6th over a minor third is what makes it sound wistful rather than ` +
    `sad.`,
  dominant7sus4: (n) =>
    `A 7th chord with the third stepped up to the 4th: ${n.join(", ")}. It has the ` +
    `seventh's pull without the third's opinion, which is why it so often falls ` +
    `onto a plain 7th a beat later.`,
  minor7flat5: (n) =>
    `A minor 7th with the fifth flattened as well — ${n.join(", ")}. Also called ` +
    `half-diminished: a diminished triad with a flattened seventh rather than a ` +
    `doubly flattened one, which is what keeps it short of a full dim7.`,
  minormajor7: (n) =>
    `A minor chord carrying the unflattened 7th — ${n.join(", ")}. The seventh ` +
    `leans up towards the root a semitone above while the third pulls the other ` +
    `way, and that tension is the entire chord.`,
};

export interface InfoPaneProps {
  chord: Chord;
  /** Null when this draft has no shape for the chord. */
  analysis: ShapeAnalysis | null;
  pro: boolean;
  spelling: RootSpelling;
}

export function InfoPane({ chord, analysis, pro, spelling }: InfoPaneProps) {
  /** A note as the reader has asked to see it. */
  const show = (note: Parameters<typeof rootName>[0]) =>
    rootName(respell(note, spelling));

  const spelled = chord.tones.map((tone) => show(tone.note));

  /*
   * Chord tones the display preference has renamed. Worth saying out loud:
   * in flat spelling D major reads D G♭ A, and G♭ is not really the third
   * of anything — F♯ is. Showing the preferred name and naming the real one
   * gives the reader what they asked for without teaching them something
   * false.
   */
  const renamed = chord.tones.filter((tone) => isRespelled(tone.note, spelling));
  const doubled = analysis?.degrees.filter((entry) => entry.count > 1) ?? [];
  const single = analysis?.degrees.filter((entry) => entry.count === 1) ?? [];
  const sounding = analysis?.strings.filter((string) => string.note).length ?? 0;
  const distinct = analysis?.degrees.filter((entry) => entry.count > 0).length ?? 0;

  return (
    <aside
      // Sized to its content: stretching it to the row height left a mostly
      // empty sheet the height of the diagram, which read as a rendering
      // fault rather than as a note.
      className="sticky-note w-full p-4 text-[13px] leading-relaxed min-[900px]:sticky min-[900px]:top-2 min-[900px]:p-6 min-[900px]:pb-9 min-[900px]:text-[15px]"
    >
      <span aria-hidden="true" className="sticky-tape" />

      <h2 className="mb-2 text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase min-[900px]:mb-3">
        What you are holding
      </h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-paper-ink-muted">The notes</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-paper-ink">
            {analysis === null ? (
              spelled.join(" ")
            ) : (
              analysis.strings.map((string, index) => (
                <span key={index} className={string.note ? "" : "text-paper-ink-muted/60"}>
                  {string.note ? show(string.note) : "×"}
                  {pro && string.degree && (
                    <span className="text-paper-accent">({string.degree})</span>
                  )}
                  {index < analysis.strings.length - 1 ? " " : ""}
                </span>
              ))
            )}
          </dd>
        </div>

        {/* Directly under the notes, because it is about them: the list
            is the chord's own notes and the slash names one more that has
            to sit beneath them. It used to open the note, which put it
            above the list — fine on a desk, wrong on a phone, where the
            first inch of the note is all that shows until you pull it up,
            and the notes are what that inch is for. */}
        {chord.bass && (
          <p className="text-paper-ink">
            <strong className="font-medium">{chord.symbol}</strong> is{" "}
            {rootName(respell(chord.root, spelling))}
            {chord.quality === "major" ? " major" : ""} with{" "}
            {show(chord.bass)} underneath.{" "}
            {inChord(chord, chord.bass)
              ? "The bass is a note the chord already has, so this is an inversion — the same chord, stood on a different foot."
              : "The bass is not in the chord, so this is not an inversion: it is the chord with a foreign note put under it."}
          </p>
        )}

        {!pro && (
          <p className="text-paper-ink-muted">
            Turn on Pro to see what each note is doing.
          </p>
        )}

        {pro && (
          <>

        {/*
          * The count, and the gap between the chord and the shape. It is
          * the fact underneath every compromise further down the note: a
          * triad has three notes and six strings, so something is doubled,
          * while a hexad has six notes and four fingers, so something has
          * to go. Saying which is which stops "left out" reading as a
          * fault in the diagram.
          */}
        <div>
          <dt className="text-paper-ink-muted">Its size</dt>
          <dd className="mt-0.5 text-paper-ink">
            {chord.symbol} is a{" "}
            <strong className="font-medium">{chordSize(chord).name}</strong> —{" "}
            {word(chord.tones.length)} different notes
            {chord.tones.length === 2
              ? ", which makes it an interval rather than a chord, whatever guitarists call it"
              : ""}
            .{" "}
            {analysis === null ? null : distinct < chord.tones.length ? (
              <>
                Six strings and four fingers will not hold {word(chord.tones.length)},
                so this shape sounds {word(distinct)} of them and leaves the rest
                to the ear.
              </>
            ) : sounding > distinct ? (
              <>
                This shape sounds all of them on {word(sounding)} strings, so{" "}
                {sounding - distinct === 1 ? "one is" : `${word(sounding - distinct)} are`}{" "}
                doubled.
              </>
            ) : (
              <>One string each, nothing doubled and nothing left out.</>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-paper-ink-muted">Why those notes</dt>
          <dd className="mt-0.5 text-paper-ink">
            {explain(
              chord.quality,
              spelled,
              chord.tones.map((tone) => tone.degree),
            )}
          </dd>
        </div>

        {/* Only when there is something to explain. With nothing doubled
            the size line above has already said so, and a heading whose
            body repeats it is worse than no heading. */}
        {analysis && doubled.length > 0 && (
        <div>
          {/* Counted off the shape, not the chord: a four-string voicing of
              a five-note chord should not be asked why it has six strings. */}
          <dt className="text-paper-ink-muted">
            {`Why ${word(sounding)} strings, ${word(distinct)} notes`}
          </dt>
          <dd className="mt-0.5 text-paper-ink">
              <>
                {doubled.map((entry, index) => (
                  <span key={entry.tone.degree}>
                    {index > 0 ? ", and the " : "The "}
                    <strong className="font-medium">{degreeWord(entry.tone.degree)}</strong>{" "}
                    ({show(entry.tone.note)}) sounds{" "}
                    {COUNT_WORDS[entry.count] ?? `${entry.count} times`}
                  </span>
                ))}
                {single.length > 0 && (
                  <>
                    , while the {single.map((entry) => degreeWord(entry.tone.degree)).join(" and ")}{" "}
                    {single.length > 1 ? "sound" : "sounds"} once
                  </>
                )}
                . Doubling a note makes the chord fuller without changing what
                it is.
              </>
          </dd>
        </div>
        )}

        {analysis && analysis.missing.length > 0 && (
          <div>
            <dt className="text-paper-ink-muted">Left out</dt>
            <dd className="mt-0.5 text-[#9c3b22]">
              This shape has no{" "}
              {analysis.missing.map((tone) => degreeWord(tone.degree)).join(" or ")}
              {/* Dropping the fifth from a chord of four notes or more is a
                  voicing decision rather than a gap, and saying so stops the
                  panel calling the standard 9th chord broken. */}
              {analysis.missing.every((tone) => tone.degree === "5") &&
              chord.tones.length > 3
                ? `. That is normal above a triad — the fifth is the note that` +
                  ` adds least, and it is the first one to go when` +
                  ` ${word(chord.tones.length)} notes have to fit under four` +
                  ` fingers.`
                : ", so it is not the full chord."}
            </dd>
          </div>
        )}

        {renamed.length > 0 && (
          <div>
            <dt className="text-paper-ink-muted">A note on the spelling</dt>
            <dd className="mt-0.5 text-paper-ink">
              {renamed.map((tone, index) => (
                <span key={tone.degree}>
                  {index > 0 && ", and "}
                  {show(tone.note)} is usually written {rootName(tone.note)} here
                </span>
              ))}
              . Same {renamed.length > 1 ? "sounds" : "sound"} either way — the{" "}
              {renamed.length > 1 ? "names follow" : "name follows"} your
              spelling choice rather than the chord.
            </dd>
          </div>
        )}

        {analysis?.inverted && (
          <div>
            <dt className="text-paper-ink-muted">Lowest note</dt>
            <dd className="mt-0.5 text-paper-ink">
              {analysis.bass.degree !== null ? (
                <>
                  The deepest string is {show(analysis.bass.note)}, the{" "}
                  {degreeWord(analysis.bass.degree)} rather than the root — an
                  inversion. That is written{" "}
                  {chord.bass ? chord.symbol : `${chord.symbol}/${show(analysis.bass.note)}`}.
                </>
              ) : (
                <>
                  The deepest string is {show(analysis.bass.note)}, which is not
                  one of the chord{"\u2019"}s own notes at all. That is what
                  separates {chord.symbol} from an inversion: nothing has been
                  turned upside down, a note from outside has been put
                  underneath.
                </>
              )}
            </dd>
          </div>
        )}
          </>
        )}
      </dl>
    </aside>
  );
}

/** Small counts read better spelled out in prose. */
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** "1" -> "root", "3" -> "third". Plain words, not degree numbers. */
function degreeWord(degree: string): string {
  return (
    {
      "1": "root",
      "2": "second",
      "3": "third",
      "♭3": "flattened third",
      "4": "fourth",
      "5": "fifth",
      "♭5": "flattened fifth",
      "6": "sixth",
      "♭♭7": "doubly flattened seventh",
      "♭7": "flattened seventh",
      "7": "seventh",
      "♯5": "raised fifth",
      "♭9": "flattened ninth",
      "9": "ninth",
      "♯9": "raised ninth",
      "11": "eleventh",
      "♯11": "raised eleventh",
      "13": "thirteenth",
    }[degree] ?? degree
  );
}

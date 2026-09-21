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

import { isRespelled, respell, rootName } from "@/core/music/chords.ts";
import type { Chord, ChordQuality, RootSpelling } from "@/core/music/chords.ts";
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
function explain(quality: ChordQuality, notes: string[]): string {
  const [root, third] = notes;
  switch (quality) {
    case "major":
      return `A major chord is the 1st, 3rd and 5th notes of its scale — ${notes.join(", ")}.`;
    case "minor":
      return (
        `A minor chord is a major one with its middle note lowered by a ` +
        `semitone: ${notes.join(", ")}. The ${third} sits one fret under where ` +
        `${root} major would put it, and that one fret is the whole difference.`
      );
    case "power":
      return (
        `Only the root and the fifth — ${notes.join(" and ")}. The third is what ` +
        `decides between major and minor, and this chord does not have one, ` +
        `which is why it sits over either.`
      );
    case "sus2":
      return (
        `Suspended. The third steps down to the note below it, the 2nd of the ` +
        `scale: ${notes.join(", ")}. With no third there is nothing to say major ` +
        `or minor, so it hangs unresolved until one arrives.`
      );
    case "sus4":
      return (
        `Suspended. The third steps up to the note above it, the 4th of the ` +
        `scale: ${notes.join(", ")}. With no third there is nothing to say major ` +
        `or minor, so it hangs unresolved until one arrives.`
      );
    case "dominant7":
      return (
        `A major chord with the 7th of the scale added and flattened a ` +
        `semitone — ${notes.join(", ")}. That flattened seventh is the note that ` +
        `sounds unfinished, and it is why a 7th chord pulls somewhere else.`
      );
    case "major7":
      return (
        `A major chord with the 7th of the scale added as it stands, ` +
        `unflattened — ${notes.join(", ")}. It lands a semitone under the root, ` +
        `which is where the softness comes from.`
      );
    case "minor7":
      return (
        `A minor chord with a flattened seventh on top — ${notes.join(", ")}. The ` +
        `same seventh a dominant chord uses, over a minor third instead of a ` +
        `major one.`
      );
    case "add9":
      return (
        `A plain major chord with the 9th added and no seventh under it — ` +
        `which is all "add" means. The 9th is the 2nd of the scale an octave ` +
        `up: ${notes.join(", ")}.`
      );
    case "dominant9":
      return (
        `A 7th chord that keeps stacking: ${notes.join(", ")}. Five notes and six ` +
        `strings is a tight fit, so guitarists drop the fifth — it is the one ` +
        `note the chord does not miss.`
      );
    case "dominant7sharp9":
      return (
        `A 7th chord with the 9th raised a semitone. The raised ninth sounds ` +
        `the same as a minor third, so this chord holds a major and a minor ` +
        `third at once — ${third} and ${notes[4]} over the same ${root} — and ` +
        `the argument between them is the whole sound.`
      );
    case "diminished":
      return `A minor chord with the fifth flattened too — ${notes.join(", ")}.`;
  }
}

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
      className="sticky-note w-full p-5 text-[13px] leading-relaxed min-[900px]:sticky min-[900px]:top-2 min-[900px]:p-6 min-[900px]:pb-9 min-[900px]:text-[15px]"
    >
      <span aria-hidden="true" className="sticky-tape" />

      <h2 className="mb-3 text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase">
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

        {!pro && (
          <p className="text-paper-ink-muted">
            Turn on Pro to see what each note is doing.
          </p>
        )}

        {pro && (
          <>

        <div>
          <dt className="text-paper-ink-muted">Why those notes</dt>
          <dd className="mt-0.5 text-paper-ink">{explain(chord.quality, spelled)}</dd>
        </div>

        {analysis && (
        <div>
          {/* Counted off the shape, not the chord: a four-string voicing of
              a five-note chord should not be asked why it has six strings. */}
          <dt className="text-paper-ink-muted">
            {doubled.length === 0
              ? "One of each"
              : `Why ${word(sounding)} strings, ${word(distinct)} notes`}
          </dt>
          <dd className="mt-0.5 text-paper-ink">
            {doubled.length === 0 ? (
              <>Each note sounds once.</>
            ) : (
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
            )}
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
                ? ". That is normal above a triad — the fifth is the note that" +
                  " adds least, and it is the first one to go when five notes" +
                  " have to fit under four fingers."
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
              The deepest string is {show(analysis.bass.note)}, the{" "}
              {degreeWord(analysis.bass.degree ?? "")} rather than the root. That
              is written {chord.symbol}/{show(analysis.bass.note)}.
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
      "♭7": "flattened seventh",
      "7": "seventh",
      "9": "ninth",
      "♯9": "raised ninth",
    }[degree] ?? degree
  );
}

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
import type { Chord, RootSpelling } from "@/core/music/chords.ts";
import type { ShapeAnalysis } from "@/core/chords/analysis.ts";

const COUNT_WORDS = ["never", "once", "twice", "three times", "four times", "five times", "six times"];

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
          <dd className="mt-0.5 text-paper-ink">
            {chord.quality === "major" ? (
              <>
                A major chord is the 1st, 3rd and 5th notes of its scale —{" "}
                <span className="font-mono">{spelled.join(", ")}</span>.
              </>
            ) : (
              <>
                A minor chord is a major one with the middle note lowered by a
                semitone. {spelled[0]} major would be{" "}
                <span className="font-mono">{spelled[0]} …</span>; flattening the
                third gives{" "}
                <span className="font-mono">{spelled.join(", ")}</span>.
              </>
            )}
          </dd>
        </div>

        {analysis && (
        <div>
          <dt className="text-paper-ink-muted">Why six strings, three notes</dt>
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
              {chord.quality === "minor" || chord.quality === "major"
                ? ", so it is not the full chord"
                : ""}
              .
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

/** "1" -> "root", "3" -> "third". Plain words, not degree numbers. */
function degreeWord(degree: string): string {
  if (degree === "1") return "root";
  if (degree === "3") return "third";
  if (degree === "♭3") return "flattened third";
  if (degree === "5") return "fifth";
  return degree;
}

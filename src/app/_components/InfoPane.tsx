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

import { rootName } from "@/core/music/chords.ts";
import type { Chord } from "@/core/music/chords.ts";
import type { ShapeAnalysis } from "@/core/chords/analysis.ts";

const COUNT_WORDS = ["never", "once", "twice", "three times", "four times", "five times", "six times"];

export interface InfoPaneProps {
  chord: Chord;
  /** Null when this draft has no shape for the chord. */
  analysis: ShapeAnalysis | null;
  pro: boolean;
}

export function InfoPane({ chord, analysis, pro }: InfoPaneProps) {
  const spelled = chord.tones.map((tone) => rootName(tone.note));
  const doubled = analysis?.degrees.filter((entry) => entry.count > 1) ?? [];
  const single = analysis?.degrees.filter((entry) => entry.count === 1) ?? [];

  return (
    <aside
      // A minimum height so the pane does not resize as you move between
      // chords, for the same reason it is always rendered.
      // Sized to its content. Stretching it to the row height left a mostly
      // empty box the height of the diagram, which read as a rendering fault
      // rather than as a panel.
      className="w-full rounded-2xl border border-edge bg-panel/70 p-4 text-[13px] leading-relaxed min-[900px]:sticky min-[900px]:top-2"
    >
      <h2 className="label-caps mb-3">What you are holding</h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-ink-muted">The notes</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-ink">
            {analysis === null ? (
              spelled.join(" ")
            ) : (
              analysis.strings.map((string, index) => (
                <span key={index} className={string.note ? "" : "text-ink-faint"}>
                  {string.note ? rootName(string.note) : "×"}
                  {pro && string.degree && (
                    <span className="text-accent">({string.degree})</span>
                  )}
                  {index < analysis.strings.length - 1 ? " " : ""}
                </span>
              ))
            )}
          </dd>
        </div>

        {!pro && (
          <p className="text-ink-faint">
            Turn on Pro to see what each note is doing.
          </p>
        )}

        {pro && (
          <>

        <div>
          <dt className="text-ink-muted">Why those notes</dt>
          <dd className="mt-0.5 text-ink">
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
          <dt className="text-ink-muted">Why six strings, three notes</dt>
          <dd className="mt-0.5 text-ink">
            {doubled.length === 0 ? (
              <>Each note sounds once.</>
            ) : (
              <>
                {doubled.map((entry, index) => (
                  <span key={entry.tone.degree}>
                    {index > 0 ? ", and the " : "The "}
                    <strong className="font-medium">{degreeWord(entry.tone.degree)}</strong>{" "}
                    ({rootName(entry.tone.note)}) sounds{" "}
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
            <dt className="text-ink-muted">Left out</dt>
            <dd className="mt-0.5 text-warn">
              This shape has no{" "}
              {analysis.missing.map((tone) => degreeWord(tone.degree)).join(" or ")}
              {chord.quality === "minor" || chord.quality === "major"
                ? ", so it is not the full chord"
                : ""}
              .
            </dd>
          </div>
        )}

        {analysis?.inverted && (
          <div>
            <dt className="text-ink-muted">Lowest note</dt>
            <dd className="mt-0.5 text-ink">
              The deepest string is {rootName(analysis.bass.note)}, the{" "}
              {degreeWord(analysis.bass.degree ?? "")} rather than the root. That
              is written {chord.symbol}/{rootName(analysis.bass.note)}.
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

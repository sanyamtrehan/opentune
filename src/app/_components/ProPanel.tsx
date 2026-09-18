"use client";

/**
 * What you are actually holding.
 *
 * The part of the chord library nobody else does. A diagram tells you where
 * to put your fingers; this tells you what comes out and why — which notes,
 * playing which role, and why the shape looks nothing like the three notes
 * the theory promised.
 *
 * Written for someone who does not already know the theory, so every line
 * says the thing rather than naming it.
 */

import { rootName } from "@/core/music/chords.ts";
import type { Chord } from "@/core/music/chords.ts";
import type { ShapeAnalysis } from "@/core/chords/analysis.ts";

const COUNT_WORDS = ["never", "once", "twice", "three times", "four times", "five times", "six times"];

export interface ProPanelProps {
  chord: Chord;
  analysis: ShapeAnalysis;
}

export function ProPanel({ chord, analysis }: ProPanelProps) {
  const spelled = chord.tones.map((tone) => rootName(tone.note));
  const doubled = analysis.degrees.filter((entry) => entry.count > 1);
  const single = analysis.degrees.filter((entry) => entry.count === 1);

  return (
    <section className="w-full max-w-[420px] flex-none rounded-2xl border border-edge bg-panel/70 p-4 text-[13px] leading-relaxed">
      <h2 className="label-caps mb-3">What you are holding</h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-ink-muted">The notes</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-ink">
            {analysis.strings.map((string, index) => (
              <span key={index} className={string.note ? "" : "text-ink-faint"}>
                {string.note ? rootName(string.note) : "×"}
                {string.degree && (
                  <span className="text-accent">({string.degree})</span>
                )}
                {index < analysis.strings.length - 1 ? " " : ""}
              </span>
            ))}
          </dd>
        </div>

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

        {analysis.missing.length > 0 && (
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

        {analysis.inverted && (
          <div>
            <dt className="text-ink-muted">Lowest note</dt>
            <dd className="mt-0.5 text-ink">
              The deepest string is {rootName(analysis.bass.note)}, the{" "}
              {degreeWord(analysis.bass.degree ?? "")} rather than the root. That
              is written {chord.symbol}/{rootName(analysis.bass.note)}.
            </dd>
          </div>
        )}
      </dl>
    </section>
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

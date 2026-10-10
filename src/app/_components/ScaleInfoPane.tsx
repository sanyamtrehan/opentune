"use client";

/**
 * The pane beside the neck, and the twin of `InfoPane` on the chord page.
 *
 * Always rendered, whether or not Pro is on, so that turning Pro on fills it
 * rather than reflowing the page — the diagram must not move under someone
 * who is reading it. With Pro off it names the scale's notes; with Pro on it
 * explains them.
 *
 * The explanation is deliberately the parallel one. A mode is nearly always
 * taught relatively — "Dorian is the white notes from D" — and that is the
 * half that tells you where to put your hands and nothing about why it
 * sounds the way it does. A player who learns only that plays the parent
 * major scale and wonders why it does not sound Dorian. So the note leads
 * with the one changed degree, names the actual note in this key, and keeps
 * the relative view for the section about finding it on the neck.
 */

import { rootName } from "@/core/music/chords.ts";
import {
  SCALES,
  diatonicChords,
  notesOutside,
  parentMajor,
  scaleAlterations,
  scaleDegrees,
  scaleNotes,
  scaleRootChoice,
  scaleTitle,
} from "@/core/music/scales.ts";
import type { ScaleName } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";

const ORDINALS = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** "♭6" -> "flattened 6th", "♯4" -> "raised 4th", "5" -> "5th". */
function degreeWord(degree: string): string {
  const index = Number(degree.replace(/[♭♯]/, "")) - 1;
  const name = ORDINALS[index] ?? degree;
  if (degree.startsWith("♭")) return `flattened ${name}`;
  if (degree.startsWith("♯")) return `raised ${name}`;
  return name;
}

/** A list in prose: "the 6th", "the 6th and the 7th". */
const join = (parts: string[]) =>
  parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/**
 * The sentences for the two scales that are not altered versions of anything.
 * Everything else has its single changed degree to talk about, which is both
 * more useful and more specific than a paragraph could be.
 */
const UNALTERED: Record<"major" | "minor", (tonic: string) => string> = {
  major: (tonic) =>
    `The scale every other one here is measured against. ${tonic} major has no ` +
    `accidentals against itself — when a degree is written ♭3 or ♯4 anywhere ` +
    `else in this browser, this is the scale it is being compared to.`,
  minor: (tonic) =>
    `Natural minor: the major scale with its 3rd, 6th and 7th all a semitone ` +
    `lower. Those same seven notes are a major scale too, started three ` +
    `degrees earlier, which is why ${tonic} minor and its relative major are ` +
    `interchangeable on paper and not at all in the ear.`,
};

export interface ScaleInfoPaneProps {
  tonic: Note;
  scale: ScaleName;
  pitchClass: number;
  pro: boolean;
}

export function ScaleInfoPane({ tonic, scale, pitchClass, pro }: ScaleInfoPaneProps) {
  const spec = SCALES[scale];
  const notes = scaleNotes(tonic, scale);
  const degrees = scaleDegrees(scale);
  const { against, changes } = scaleAlterations(scale);
  const parent = parentMajor(tonic, scale);
  const choice = scaleRootChoice(pitchClass, scale);
  const chords = diatonicChords(tonic, scale);
  const outside = notesOutside(tonic, scale);
  const parallel = scaleNotes(tonic, against);

  const name = scaleTitle(tonic, scale);
  const home = chords[0];
  // The relative major of the parallel minor: what a scale that is a mode of
  // nothing is nearly a mode of. A minor's other notes are C major's.
  const relativeMajor = parentMajor(tonic, "minor");

  /*
   * The chord on the fifth degree, which is the one that decides whether a
   * key resolves. Three different things to say about it, and saying the
   * wrong one is worse than saying nothing:
   *
   *   - Locrian has no perfect fifth at all, so it has no dominant to
   *     discuss and the question does not arise.
   *   - Harmonic and melodic minor turn a minor v into a major V, which is
   *     the entire reason they exist.
   *   - Mixolydian and Phrygian go the other way, and calling that a pull
   *     home would be exactly backwards.
   */
  const parallelChords = diatonicChords(tonic, against);
  const fifth = chords[4];
  const parallelFifth = parallelChords[4];
  const hasFifth = spec.steps[4] === 7;
  const fifthMoved = parallelFifth.chord.quality !== fifth.chord.quality;
  const gainedPull = fifthMoved && fifth.chord.quality === "major";

  return (
    <aside className="sticky-note w-full p-4 text-[13px] leading-relaxed min-[900px]:sticky min-[900px]:top-2 min-[900px]:p-6 min-[900px]:pb-9 min-[900px]:text-[15px]">
      <span aria-hidden="true" className="sticky-tape" />

      <h2 className="mb-2 text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase min-[900px]:mb-3">
        What you are playing
      </h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-paper-ink-muted">The notes</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-paper-ink">
            {notes.map((note, index) => (
              <span key={index}>
                {rootName(note)}
                {pro && <span className="text-paper-accent">({degrees[index]})</span>}
                {index < notes.length - 1 ? " " : ""}
              </span>
            ))}
          </dd>
        </div>

        {!pro && (
          <p className="text-paper-ink-muted">
            Turn on Pro to see what each note is doing.
          </p>
        )}

        {pro && (
          <>
            {/*
              * The parallel view, first, because it is the one that explains
              * the sound. Said with the actual notes of this key rather than
              * with degree numbers: "B♮ where D minor has B♭" is something
              * you can go and play.
              */}
            <div>
              <dt className="text-paper-ink-muted">What makes it itself</dt>
              <dd className="mt-0.5 text-paper-ink">
                {changes.length === 0 ? (
                  UNALTERED[against](rootName(tonic))
                ) : (
                  <>
                    {name} is {rootName(tonic)} {against} with the{" "}
                    {join(changes.map((change) => degreeWord(change.parentDegree)))}{" "}
                    {changes.length > 1 ? "both " : ""}
                    {/* Safe to speak for all of them: no scale here moves one
                        degree up and another down. Locrian lowers twice,
                        melodic minor raises twice. */}
                    {changes[0].direction} a semitone:{" "}
                    {join(
                      changes.map(
                        (change) =>
                          `${rootName(notes[change.index])} where ${rootName(tonic)} ` +
                          `${against} has ${rootName(parallel[change.index])}`,
                      ),
                    )}
                    . {changes.length === 1 ? "That one note" : "Those notes"} {changes.length === 1 ? "is" : "are"} the
                    whole difference, and {changes.length === 1 ? "it is" : "they are"} what to lean on if you
                    want anyone to hear which scale this is.
                  </>
                )}
              </dd>
            </div>

            {/*
              * The relative view, kept separate and named for what it is good
              * for. Running the two together is how "Dorian is the white
              * notes from D" ends up sounding like an explanation of the
              * sound, which it is not.
              */}
            <div>
              <dt className="text-paper-ink-muted">Finding it on the neck</dt>
              <dd className="mt-0.5 text-paper-ink">
                {parent ? (
                  spec.modeOf === 0 ? (
                    <>
                      Its own shape. Every other scale here is this one with a
                      degree moved, or this one started somewhere else.
                    </>
                  ) : (
                    <>
                      These are the notes of {rootName(parent)} major, played from{" "}
                      {rootName(tonic)} — the {ORDINALS[spec.modeOf ?? 0]} degree of it. So
                      the shape is one you already know: play {rootName(parent)} major
                      and resolve to {rootName(tonic)} instead. Phrase it towards{" "}
                      {rootName(parent)} and you are playing {rootName(parent)} major
                      again, whatever the diagram says.
                    </>
                  )
                ) : (
                  <>
                    No shortcut here: no major scale holds all seven of these
                    together, so there is no parent shape to borrow. What breaks
                    it is the{" "}
                    {join(changes.map((change) => degreeWord(change.degree)))} —{" "}
                    {join(changes.map((change) => rootName(notes[change.index])))}.
                    The other six notes are {relativeMajor ? scaleTitle(relativeMajor, "major") : "a major scale"}
                    {"\u2019"}s, and {relativeMajor ? scaleTitle(relativeMajor, "major") : "it"} has{" "}
                    {join(changes.map((change) => rootName(parallel[change.index])))} instead.
                    That is also why it sounds like neither of the scales it sits
                    between.
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Its chords</dt>
              <dd className="mt-0.5 text-paper-ink">
                <span className="font-mono text-[13px] min-[900px]:text-[14px]">
                  {chords.map((entry, index) => (
                    <span key={entry.degree}>
                      {entry.chord.symbol}
                      <span className="text-paper-ink-muted">
                        {" "}({entry.numeral}){index < chords.length - 1 ? " · " : ""}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-1.5 block">
                  Stack a third and a fifth on each note, using only notes from
                  the scale, and these seven fall out.{" "}
                  {hasFifth && <>{home.chord.symbol} is home. </>}
                  {!hasFifth ? (
                    <>
                      There is no perfect fifth in this scale, so there is no
                      dominant to pull anywhere and the chord on the tonic is
                      diminished. It is a colour rather than a key, which is why
                      almost nothing is written in it.
                    </>
                  ) : gainedPull ? (
                    <>
                      The {fifth.numeral} is {fifth.chord.symbol} where {rootName(tonic)}{" "}
                      {against} has {parallelFifth.chord.symbol}, and that is the whole
                      point of the scale: a major chord on the fifth degree leans back
                      to {home.chord.symbol}, and a minor one does not.
                    </>
                  ) : fifthMoved ? (
                    <>
                      The {fifth.numeral} is {fifth.chord.symbol} where {rootName(tonic)}{" "}
                      {against} has {parallelFifth.chord.symbol}. The fifth degree is the
                      chord that pulls a key home, and this one does not — which is a
                      large part of why the scale sounds unresolved even when it stops.
                    </>
                  ) : (
                    <>
                      They are the same seven chords in every key, which is why the
                      numerals are worth more than the names.
                    </>
                  )}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">What it leaves out</dt>
              <dd className="mt-0.5 text-paper-ink">
                Seven notes of twelve. The other five —{" "}
                <span className="font-mono">{outside.map(rootName).join(" ")}</span> —
                are the outlined dots on the neck, and a scale is as much the
                choice to leave those out as it is the seven it keeps.
              </dd>
            </div>

            {/*
              * Only where there was a decision to report. On a white key there
              * is no second name worth the argument, and a heading explaining
              * why C is called C would be noise.
              */}
            {choice.rejected && (
              <div>
                <dt className="text-paper-ink-muted">A note on the spelling</dt>
                <dd className="mt-0.5 text-paper-ink">
                  {choice.chosenCost === choice.rejectedCost ? (
                    <>
                      {rootName(choice.chosen)} and {rootName(choice.rejected)} cost the
                      same here — the same number of accidentals either way, and both
                      names are used. {rootName(choice.chosen)} is the one charts
                      settled on.
                    </>
                  ) : (
                    <>
                      Written {rootName(choice.chosen)} rather than{" "}
                      {rootName(choice.rejected)}, which is the same pitch.{" "}
                      {scaleTitle(choice.rejected, scale)} is legal
                      and spells out as{" "}
                      <span className="font-mono">
                        {scaleNotes(choice.rejected, scale).map(rootName).join(" ")}
                      </span>{" "}
                      — nobody writes that when the other name is to hand.
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

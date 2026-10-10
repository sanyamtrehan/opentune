"use client";

/**
 * The note beside the circle — twin of `CagedInfoPane` and `ScaleInfoPane`.
 *
 * Always rendered so turning Pro on fills it rather than reflowing the page
 * under someone reading it. With Pro off it names the key and its chords.
 * With Pro on it says the four things the drawing itself cannot:
 *
 *   1. Why the signature is the size it is, with the actual accidentals —
 *      because in this codebase the signature is *computed*, not looked up,
 *      and saying so is the difference between a poster and an explanation.
 *   2. Why the lit block is a block, named with the real chords.
 *   3. What happened to the seventh chord.
 *   4. What the neighbouring keys cost: one note each, named both ways.
 */

import { rootName } from "@/core/music/chords.ts";
import type { DiatonicChord } from "@/core/music/scales.ts";
import { scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import { midiOf } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";
import { pitchClassAt } from "./KeyCircle";

const pcOf = (note: Note) => ((midiOf(note) % 12) + 12) % 12;

/** What changes between this key and its neighbour: exactly one note, both ways. */
function oneNoteApart(here: Note[], there: Note[]) {
  const hereSet = new Set(here.map(pcOf));
  const thereSet = new Set(there.map(pcOf));
  return {
    gained: there.find((n) => !hereSet.has(pcOf(n))) ?? null,
    lost: here.find((n) => !thereSet.has(pcOf(n))) ?? null,
    shared: here.filter((n) => thereSet.has(pcOf(n))).length,
  };
}

export interface FifthsInfoPaneProps {
  keyIndex: number;
  tonic: Note;
  chords: DiatonicChord[];
  degree: number;
  pro: boolean;
}

export function FifthsInfoPane({ keyIndex, tonic, chords, degree, pro }: FifthsInfoPaneProps) {
  const notes = scaleNotes(tonic, "major");
  const accidentals = notes.filter((n) => n.accidental !== 0);
  const sharp = accidentals.length > 0 && accidentals[0].accidental > 0;
  const picked = chords[degree - 1];

  const up = scaleRoot(pitchClassAt(keyIndex + 1), "major");
  const down = scaleRoot(pitchClassAt(keyIndex + 11), "major");
  const toUp = oneNoteApart(notes, scaleNotes(up, "major"));
  const toDown = oneNoteApart(notes, scaleNotes(down, "major"));

  const seventh = chords[6];

  /*
   * Where this key's name for a segment differs from the segment's own.
   * Only happens near the bottom of the circle, and it is the most useful
   * thing on the whole drawing to be able to point at: one key's C♯ is
   * another's D♭, and which one is correct is decided by the key, not by
   * the note.
   */
  const seam = ([
    [11, 4],
    [1, 5],
  ] as const)
    .map(([step, deg]) => {
      const own = scaleRoot(pitchClassAt(keyIndex + step), "major");
      const inKey = chords[deg - 1].chord.root;
      return rootName(own) === rootName(inKey)
        ? null
        : { own: rootName(own), inKey: rootName(inKey), numeral: chords[deg - 1].numeral };
    })
    .filter((x) => x !== null);

  return (
    <aside className="sticky-note w-full p-4 text-[13px] leading-relaxed min-[900px]:p-6 min-[900px]:pb-9 min-[900px]:text-[15px]">
      <span aria-hidden="true" className="sticky-tape" />

      <h2 className="mb-2 text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase min-[900px]:mb-3">
        The key
      </h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-paper-ink-muted">
            {rootName(tonic)} major ·{" "}
            {accidentals.length === 0
              ? "no sharps or flats"
              : `${accidentals.length} ${sharp ? "sharp" : "flat"}${accidentals.length > 1 ? "s" : ""}`}
          </dt>
          <dd className="mt-0.5 font-mono text-[15px] text-paper-ink">
            {chords.map((c, i) => (
              <span key={i} className={i + 1 === degree ? "text-paper-accent" : undefined}>
                {c.chord.symbol}
                {i < chords.length - 1 ? " " : ""}
              </span>
            ))}
          </dd>
        </div>

        {!pro && (
          <p className="text-paper-ink-muted">
            Turn on Pro to see why the signature is this size, and why six of
            these seven chords sit next to each other on the circle.
          </p>
        )}

        {pro && (
          <>
            <div>
              <dt className="text-paper-ink-muted">Why {accidentals.length} </dt>
              <dd className="mt-0.5 text-paper-ink">
                {accidentals.length === 0 ? (
                  <>
                    C major is the one key that needs no accidental at all, which
                    is the only reason it sits at the top of the circle. Every
                    step clockwise from here adds a sharp; every step the other
                    way adds a flat.
                  </>
                ) : (
                  <>
                    Spelling {rootName(tonic)} major one note per letter forces{" "}
                    <span className="font-mono text-paper-accent">
                      {accidentals.map((n) => rootName(n)).join(" ")}
                    </span>
                    . That count is not a table in this app — `scaleRoot` spells
                    the key both ways and keeps whichever needs fewer
                    accidentals, and the circle is simply those counts put in
                    order.
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Why the lit part is one block</dt>
              <dd className="mt-0.5 text-paper-ink">
                {chords[0].chord.symbol} with {chords[3].chord.symbol} and{" "}
                {chords[4].chord.symbol} either side of it — I, IV and V are
                neighbours because a key and its two closest keys differ by one
                note each. Directly inside those three sit{" "}
                {chords[5].chord.symbol}, {chords[1].chord.symbol} and{" "}
                {chords[2].chord.symbol}, their relative minors, which are vi, ii
                and iii. Six of the seven chords of {rootName(tonic)} major, in
                one unbroken block — and the block is the same shape in every
                key, just turned.
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">The seventh chord</dt>
              <dd className="mt-0.5 text-paper-ink">
                {seventh.chord.symbol} has no segment. The circle is built of
                major keys and their relative minors, and a diminished triad is
                neither, so there is nowhere on it to put one. That is not a gap
                in the drawing — it is the reason {seventh.chord.symbol} never
                behaves like the other six.
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">What the next key costs</dt>
              <dd className="mt-0.5 text-paper-ink">
                <span className="block">
                  One step clockwise is {rootName(up)} major: {toUp.shared} of
                  these seven notes stay,{" "}
                  {toUp.lost && toUp.gained && (
                    <>
                      and {rootName(toUp.lost)} becomes{" "}
                      <span className="font-mono text-paper-accent">
                        {rootName(toUp.gained)}
                      </span>
                    </>
                  )}
                  .
                </span>
                <span className="mt-1 block">
                  One step the other way is {rootName(down)} major:{" "}
                  {toDown.lost && toDown.gained && (
                    <>
                      {rootName(toDown.lost)} becomes{" "}
                      <span className="font-mono text-paper-accent">
                        {rootName(toDown.gained)}
                      </span>
                    </>
                  )}
                  .
                </span>
                <span className="mt-2 block text-paper-ink-muted">
                  That is the whole of what &ldquo;related keys&rdquo; means, and
                  why a song can slip into either without anything sounding
                  broken. Keys on the far side of the circle share four notes,
                  not six.
                </span>
              </dd>
            </div>

            {seam.length > 0 && (
              <div>
                <dt className="text-paper-ink-muted">At the seam</dt>
                <dd className="mt-0.5 text-paper-ink">
                  {seam.map((s, i) => (
                    <span key={i} className="block">
                      The segment the circle otherwise calls {s.own} is{" "}
                      <span className="font-mono text-paper-accent">{s.inKey}</span> here,
                      because {rootName(tonic)} major has no {s.own} in it. Same
                      pitch, different name, and the key is what decides — which
                      is why this app stores notes as letters and accidentals
                      rather than as numbers 0 to 11.
                    </span>
                  ))}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-paper-ink-muted">This chord</dt>
              <dd className="mt-0.5 text-paper-ink">
                {picked.chord.symbol} is the {picked.numeral} of{" "}
                {rootName(tonic)} major —{" "}
                <span className="font-mono text-paper-accent">
                  {picked.chord.tones.map((t) => rootName(t.note)).join(" ")}
                </span>
                . The shapes beside this note are every way to play it on a
                standard-tuned neck, nearest the nut first.
              </dd>
            </div>
          </>
        )}
      </dl>
    </aside>
  );
}

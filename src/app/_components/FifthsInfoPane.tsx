"use client";

/**
 * The note beside the circle — twin of `CagedInfoPane` and `ScaleInfoPane`.
 *
 * Always rendered so turning Pro on fills it rather than reflowing the page
 * under someone reading it.
 *
 * Nothing here asserts the familiar "the chords of a key are neighbours".
 * It counts. For major that produces the famous block of six touching
 * segments; for a mode it produces the same block, which is the relative
 * view stated out loud; and for harmonic minor it reports the truth, which
 * is that three chords have no segment and the rest no longer touch. A
 * paragraph claiming otherwise would be wrong in a third of the scales
 * this browser offers.
 */

import { rootName } from "@/core/music/chords.ts";
import type { DiatonicChord, ScaleName } from "@/core/music/scales.ts";
import { SCALES, scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";
import { indexOfMajor, pcOf, pitchClassAt, seatOf } from "./KeyCircle";

/** Whether a set of segments forms one unbroken arc of the circle. */
function contiguous(indices: number[]): boolean {
  const set = new Set(indices);
  if (set.size === 0) return false;
  for (let start = 0; start < 12; start++) {
    let ok = true;
    for (let k = 0; k < set.size; k++) if (!set.has((start + k) % 12)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

/** What changes between two keys: which notes stay, and which one swaps. */
function oneNoteApart(here: Note[], there: Note[]) {
  const hereSet = new Set(here.map(pcOf));
  const thereSet = new Set(there.map(pcOf));
  return {
    gained: there.find((n) => !hereSet.has(pcOf(n))) ?? null,
    lost: here.find((n) => !thereSet.has(pcOf(n))) ?? null,
    shared: here.filter((n) => thereSet.has(pcOf(n))).length,
  };
}

const list = (parts: string[]) =>
  parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

export interface FifthsInfoPaneProps {
  tonic: Note;
  scale: ScaleName;
  /** The major key whose signature this scale is written with. */
  signatureTonic: Note;
  chords: DiatonicChord[];
  degree: number;
  pro: boolean;
}

export function FifthsInfoPane({
  tonic,
  scale,
  signatureTonic,
  chords,
  degree,
  pro,
}: FifthsInfoPaneProps) {
  const scaleName = SCALES[scale].name.toLowerCase();
  const signatureNotes = scaleNotes(signatureTonic, "major");
  const accidentals = signatureNotes.filter((n) => n.accidental !== 0);
  const sharp = accidentals.length > 0 && accidentals[0].accidental > 0;

  // Notes the scale uses that its signature does not carry — harmonic
  // minor's raised 7th is the whole point of this line existing.
  const inSignature = new Set(signatureNotes.map(pcOf));
  const extras = scaleNotes(tonic, scale).filter((n) => !inSignature.has(pcOf(n)));

  const seated = chords.map((c) => ({ chord: c, seat: seatOf(c) }));
  const homeless = seated.filter((s) => s.seat === null).map((s) => s.chord);
  const indices = seated.filter((s) => s.seat !== null).map((s) => s.seat!.index);
  const touching = contiguous(indices);

  const home = indexOfMajor(pcOf(signatureTonic));
  const up = scaleRoot(pitchClassAt(home + 1), "major");
  const down = scaleRoot(pitchClassAt(home + 11), "major");
  const toUp = oneNoteApart(signatureNotes, scaleNotes(up, "major"));
  const toDown = oneNoteApart(signatureNotes, scaleNotes(down, "major"));

  const picked = chords[degree - 1];

  /* Where this key's name for a segment differs from the segment's own.
     One key's C♯ is another's D♭, and the key decides. */
  const seam = seated
    .filter((s) => s.seat !== null)
    .map(({ chord: c, seat }) => {
      const ownMajor = scaleRoot(pitchClassAt(seat!.index), "major");
      const own = seat!.ring === "outer" ? rootName(ownMajor) : `${rootName(scaleNotes(ownMajor, "major")[5])}m`;
      return own === c.chord.symbol ? null : { own, inKey: c.chord.symbol };
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
            {rootName(tonic)} {scaleName} ·{" "}
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
            Turn on Pro to see where the signature comes from, and which of
            these seven chords the circle has room for.
          </p>
        )}

        {pro && (
          <>
            <div>
              <dt className="text-paper-ink-muted">Where the signature comes from</dt>
              <dd className="mt-0.5 text-paper-ink">
                {accidentals.length === 0 ? (
                  <>No sharps and no flats — the one signature that needs nothing. </>
                ) : (
                  <>
                    Spelling {rootName(signatureTonic)} major one note per letter
                    forces{" "}
                    <span className="font-mono text-paper-accent">
                      {accidentals.map((n) => rootName(n)).join(" ")}
                    </span>
                    . That count is not a table in this app — `scaleRoot` spells
                    a key both ways and keeps whichever needs fewer accidentals,
                    and the circle is those counts put in order.{" "}
                  </>
                )}
                {scale !== "major" && (
                  <>
                    {rootName(tonic)} {scaleName} is written with it rather than
                    owning one: {SCALES[scale].modeOf !== null
                      ? `it has exactly the notes of ${rootName(signatureTonic)} major, started somewhere else.`
                      : `it is a mode of nothing, so it borrows natural minor's signature and writes what is left over as accidentals.`}
                  </>
                )}
                {extras.length > 0 && (
                  <>
                    {" "}
                    The{" "}
                    <span className="font-mono text-paper-accent">
                      {extras.map((n) => rootName(n)).join(" ")}
                    </span>{" "}
                    {extras.length === 1 ? "is" : "are"} outside the signature
                    altogether, which is why {rootName(tonic)} {scaleName} cannot
                    have a position of its own on this circle.
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">What the circle has room for</dt>
              <dd className="mt-0.5 text-paper-ink">
                {indices.length} of the seven chords have a segment
                {touching ? (
                  <>
                    , and they all touch: one unbroken block of the circle. That
                    is what makes a key feel like a place rather than a list —
                    everything in it is a neighbour of everything else.
                  </>
                ) : (
                  <>
                    , and they do <em>not</em> touch. The block a key normally
                    makes is broken here, which is the honest picture:{" "}
                    {rootName(tonic)} {scaleName} is not a region of this circle,
                    it is a scale that borrows one and then alters it.
                  </>
                )}
                {homeless.length > 0 && (
                  <span className="mt-2 block">
                    {list(homeless.map((c) => c.chord.symbol))}{" "}
                    {homeless.length === 1 ? "has" : "have"} none. The circle is
                    built of major keys and their relative minors, and{" "}
                    {homeless.length === 1 ? "a " : ""}
                    {list([...new Set(homeless.map((c) => c.chord.quality))])}{" "}
                    {homeless.length === 1 ? "triad is" : "triads are"} neither.
                    That absence is not a gap in the drawing — it is the reason{" "}
                    {homeless.length === 1 ? "it does" : "they do"} not behave
                    like the rest of the key.
                  </span>
                )}
              </dd>
            </div>

            {seam.length > 0 && (
              <div>
                <dt className="text-paper-ink-muted">At the seam</dt>
                <dd className="mt-0.5 text-paper-ink">
                  {seam.map((s, i) => (
                    <span key={i} className="block">
                      The segment the circle otherwise calls {s.own} is{" "}
                      <span className="font-mono text-paper-accent">{s.inKey}</span>{" "}
                      here, because this key has no {s.own} in it. Same pitch,
                      different name, and the key is what decides — which is why
                      this app stores notes as letters and accidentals rather
                      than as numbers 0 to 11.
                    </span>
                  ))}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-paper-ink-muted">What the next key costs</dt>
              <dd className="mt-0.5 text-paper-ink">
                <span className="block">
                  One step clockwise is {rootName(up)} major: {toUp.shared} of the
                  seven notes stay
                  {toUp.lost && toUp.gained && (
                    <>
                      , and {rootName(toUp.lost)} becomes{" "}
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

            <div>
              <dt className="text-paper-ink-muted">This chord</dt>
              <dd className="mt-0.5 text-paper-ink">
                {picked.chord.symbol} is the {picked.numeral} of {rootName(tonic)}{" "}
                {scaleName} —{" "}
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

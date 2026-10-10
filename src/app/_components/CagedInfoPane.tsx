"use client";

/**
 * The pane beside the wheel — the CAGED prototype's twin of `ScaleInfoPane`.
 *
 * Always rendered, Pro or not, so turning Pro on fills it rather than
 * reflowing the page under someone reading it. Same bargain as the chord
 * and scale pages.
 *
 * With Pro off it names the notes the shape sounds. With Pro on it says the
 * four things a diagram cannot:
 *
 *   1. Which open chord this shape *is*, since that is the whole mnemonic.
 *   2. The arithmetic for placing it — which string carries the root, and
 *      how far above the barre it sits. This is how you find the shape in a
 *      second instead of counting up from the nut.
 *   3. Where it joins its neighbours. The shared notes are computed, not
 *      asserted, and they are the part of CAGED nothing static conveys:
 *      the boxes interlock at real positions, and those positions are how
 *      you get out of one box and into the next.
 *   4. Whether it is honestly playable as a barre. Two of the five are not,
 *      and `core/chords/movable.ts` already refuses to generate them for
 *      exactly that reason — saying so here is cheaper than letting someone
 *      discover it with a sore hand.
 */

import type { Placement } from "./caged-shapes";
import { MUTED, OPEN_PC, STRING_LABEL, degreeOf, soundedBy } from "./caged-shapes";

export interface CagedInfoPaneProps {
  places: Placement[];
  active: Placement;
  tonicName: string;
  rootPitchClass: number;
  nameOf: (pitchClass: number) => string;
  pro: boolean;
}

/** The notes two shapes hold down at the very same string and fret. */
function sharedWith(a: Placement, b: Placement) {
  const mine = soundedBy(a);
  return soundedBy(b).filter((n) =>
    mine.some((m) => m.string === n.string && m.fret === n.fret),
  );
}

export function CagedInfoPane({
  places,
  active,
  tonicName,
  rootPitchClass,
  nameOf,
  pro,
}: CagedInfoPaneProps) {
  const index = places.indexOf(active);
  const before = places[index - 1];
  const after = places[index + 1];
  const atNut = active.barre === 0;
  const notes = soundedBy(active);

  const rootString = STRING_LABEL[active.form.rootString];
  const rootFret = active.barre + active.form.rootOffset;

  return (
    <aside className="sticky-note w-full p-4 text-[13px] leading-relaxed min-[900px]:p-6 min-[900px]:pb-9 min-[900px]:text-[15px]">
      <span aria-hidden="true" className="sticky-tape" />

      <h2 className="mb-2 text-[10px] tracking-[0.18em] text-paper-ink-muted uppercase min-[900px]:mb-3">
        What you are playing
      </h2>

      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-paper-ink-muted">
            {tonicName} major · {active.form.letter} shape ·{" "}
            {atNut ? "open" : `fret ${active.barre}`}
          </dt>
          <dd className="mt-0.5 font-mono text-[15px] text-paper-ink">
            {notes.map((n, i) => (
              <span key={i}>
                {nameOf(n.pitchClass)}
                {pro && (
                  <span className="text-paper-accent">
                    ({degreeOf(n.pitchClass, rootPitchClass)})
                  </span>
                )}
                {i < notes.length - 1 ? " " : ""}
              </span>
            ))}
          </dd>
        </div>

        {!pro && (
          <p className="text-paper-ink-muted">
            Turn on Pro to see how the shape is built, and where it joins the
            shapes either side of it.
          </p>
        )}

        {pro && (
          <>
            <div>
              <dt className="text-paper-ink-muted">Which shape this is</dt>
              <dd className="mt-0.5 text-paper-ink">
                {atNut ? (
                  <>
                    The open {active.form.letter} chord itself — no barre, the nut
                    doing the work. Every other {active.form.letter} shape on this
                    neck is this grip with a finger where the nut was.
                  </>
                ) : (
                  <>
                    The open {active.form.letter} chord, moved up {active.barre}{" "}
                    {active.barre === 1 ? "fret" : "frets"}, with the first finger
                    doing what the nut did. The fingers do not change — that is
                    the entire reason the five shapes are named after chords you
                    already know.
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Finding it</dt>
              <dd className="mt-0.5 text-paper-ink">
                Its root is on the {rootString} string
                {active.form.rootOffset === 0 ? (
                  <>, right at the barre.</>
                ) : (
                  <>
                    , {active.form.rootOffset}{" "}
                    {active.form.rootOffset === 1 ? "fret" : "frets"} above it.
                  </>
                )}{" "}
                So: find {tonicName} on the {rootString} string — fret {rootFret} —
                {active.form.rootOffset === 0
                  ? " and that is where the shape starts."
                  : ` then count back ${active.form.rootOffset} to fret ${active.barre}, and that is where the shape starts.`}{" "}
                Counting up from the nut every time is what makes CAGED feel slow;
                this is the thing to memorise instead.
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Where it joins its neighbours</dt>
              <dd className="mt-0.5 text-paper-ink">
                {!before && !after ? (
                  <>Nothing adjacent on this stretch of neck.</>
                ) : (
                  <>
                    {[before, after].filter(Boolean).map((other, i) => {
                      const shared = sharedWith(active, other!);
                      return (
                        <span key={i} className="mt-1 block">
                          The {other!.form.letter} shape at{" "}
                          {other!.barre === 0 ? "the nut" : `fret ${other!.barre}`}{" "}
                          {shared.length === 0 ? (
                            <>touches this one but holds none of the same notes.</>
                          ) : (
                            <>
                              holds {shared.length === 1 ? "one note" : `${shared.length} notes`}{" "}
                              in common with it:{" "}
                              <span className="font-mono text-paper-accent">
                                {shared
                                  .map(
                                    (n) =>
                                      `${nameOf(n.pitchClass)} ${STRING_LABEL[n.string]}/${n.fret}`,
                                  )
                                  .join(", ")}
                              </span>
                              .
                            </>
                          )}
                        </span>
                      );
                    })}
                    <span className="mt-2 block text-paper-ink-muted">
                      Those shared notes are the doors. They are the same string at
                      the same fret in both shapes, so they are where a line can
                      leave one box and carry on in the next without a jump.
                    </span>
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Playing it honestly</dt>
              <dd className="mt-0.5 text-paper-ink">{active.form.playNote}</dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Coming round again</dt>
              <dd className="mt-0.5 text-paper-ink">
                {active.lap > 0 ? (
                  <>
                    This is the second lap: the same shape as fret{" "}
                    {active.barre - 12}, an octave up. The wheel has gone a full
                    turn to get here, which is what a turn of the wheel means —
                    twelve frets.
                  </>
                ) : (
                  <>
                    This shape returns at fret {active.barre + 12}, an octave
                    higher and identical under the fingers. Twelve frets is one
                    full turn of the wheel, which is why the five wedges close
                    into a circle instead of running off the end.
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-paper-ink-muted">Every string</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-paper-ink">
                {Array.from({ length: 6 }, (_, i) => {
                  const off = active.form.offsets[i];
                  const label = STRING_LABEL[i];
                  if (off === MUTED) {
                    return (
                      <span key={i} className="block text-paper-ink-muted">
                        {label} — not played
                      </span>
                    );
                  }
                  const pc = (OPEN_PC[i] + active.barre + off) % 12;
                  return (
                    <span key={i} className="block">
                      {label} — fret {active.barre + off} — {nameOf(pc)}{" "}
                      <span className="text-paper-accent">
                        ({degreeOf(pc, rootPitchClass)})
                      </span>
                    </span>
                  );
                })}
              </dd>
            </div>
          </>
        )}
      </dl>
    </aside>
  );
}

"use client";

/**
 * The circle of fifths, drawn from the rule rather than from a poster.
 *
 * Twelve segments, each a fifth above the last, so position i is pitch
 * class (i * 7) % 12 and nothing is typed out. Majors on the outer ring,
 * their relative minors directly inside them.
 *
 * Which segments light is **derived from the key's chords**, not assumed.
 * A major triad goes to the outer segment with its root; a minor triad to
 * the inner segment whose relative minor it is; and a chord that is
 * neither — a diminished or augmented triad — has nowhere to go, because
 * the circle is built of major and minor keys and nothing else.
 *
 * That derivation is the whole reason this is worth drawing. For major it
 * reproduces the familiar block of six touching segments. For the modes it
 * produces the *same* block, since a mode shares its parent's notes, which
 * is the relative view made visual. For harmonic minor it visibly
 * shatters: three of the seven chords have no segment at all, and the rest
 * no longer touch. Asserting "the chords of a key are neighbours" would
 * have been a lie in that case; computing it tells the truth in every one.
 *
 * Deliberately *not* shaped like the CAGED wheel. That one is five uneven
 * wedges with a marker riding the rim and it means fret positions; this is
 * twelve even segments in two rings and means key relationships. A reader
 * who conflates them learns something false, so they are built to look
 * nothing alike and never appear on screen together.
 */

import { rootName } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import type { DiatonicChord } from "@/core/music/scales.ts";
import { scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";

/** Pitch class at each position: a fifth per step, so nothing is tabulated. */
export const pitchClassAt = (index: number) => ((((index % 12) + 12) % 12) * 7) % 12;

/** The segment index that carries a given major key. */
export const indexOfMajor = (pitchClass: number) => {
  const pc = ((pitchClass % 12) + 12) % 12;
  for (let i = 0; i < 12; i++) if (pitchClassAt(i) === pc) return i;
  return 0;
};

/** The segment whose inner ring carries a given minor key. */
export const indexOfMinor = (pitchClass: number) => indexOfMajor(pitchClass + 3);

export const pcOf = (note: Note) => ((midiOf(note) % 12) + 12) % 12;

/** A chord sits on the outer ring if it is major, the inner ring if minor. */
export function seatOf(chord: DiatonicChord): { index: number; ring: "outer" | "inner" } | null {
  const pc = pcOf(chord.chord.root);
  if (chord.chord.quality === "major") return { index: indexOfMajor(pc), ring: "outer" };
  if (chord.chord.quality === "minor") return { index: indexOfMinor(pc), ring: "inner" };
  return null;
}

/** The relative minor of a key, spelled inside that key — D♯m under F♯, not E♭m. */
export function relativeMinorName(majorTonic: Note): string {
  return `${rootName(scaleNotes(majorTonic, "major")[5])}m`;
}

const CC = 170;
const OUT_R = 162;
const MID_R = 116;
const IN_R = 74;
const GAP = 1.6;

const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r2(CC + r * Math.cos(a)), r2(CC + r * Math.sin(a))];
}

function ring(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r0, a0);
  const [x1, y1] = polar(r1, a0);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r0, a1);
  return `M ${x0} ${y0} L ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 0 0 ${x0} ${y0} Z`;
}

export interface KeyCircleProps {
  /** The chosen key's chords. Everything lit is worked out from these. */
  chords: DiatonicChord[];
  /** 1-7, which chord is being shown on the neck. */
  degree: number;
  centreTitle: string;
  centreSub: string;
  signature: string;
  onPickDegree: (degree: number) => void;
  onPickKey: (pitchClass: number, kind: "major" | "minor") => void;
}

export function KeyCircle({
  chords,
  degree,
  centreTitle,
  centreSub,
  signature,
  onPickDegree,
  onPickKey,
}: KeyCircleProps) {
  const seats = chords.map((c) => ({ chord: c, seat: seatOf(c) }));
  const at = (index: number, ring: "outer" | "inner") =>
    seats.find((s) => s.seat?.index === index && s.seat.ring === ring)?.chord ?? null;

  return (
    <svg
      viewBox="0 0 340 340"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Circle of fifths, ${centreTitle} ${centreSub.toLowerCase()} selected`}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const a0 = i * 30 - 15 + GAP;
        const a1 = i * 30 + 15 - GAP;
        const mid = i * 30;
        const pc = pitchClassAt(i);
        const major = scaleRoot(pc, "major");

        const outer = at(i, "outer");
        const inner = at(i, "inner");
        const outerPicked = outer?.degree === degree;
        const innerPicked = inner?.degree === degree;
        const outerTonic = outer?.degree === 1;
        const innerTonic = inner?.degree === 1;

        /* Amber is the tonic, because that is what a root is everywhere else
           in this app; accent blue is the rest of the key, which is what a
           chord tone is. Nothing here invents a new colour. */
        const outerFill = outerTonic
          ? "var(--color-finger-1)"
          : outerPicked
            ? "var(--color-accent)"
            : outer
              ? "var(--color-accent)"
              : "var(--color-panel-raised)";
        const innerFill = innerTonic
          ? "var(--color-finger-1)"
          : inner
            ? "var(--color-accent)"
            : "var(--color-panel)";

        const [ox, oy] = polar((OUT_R + MID_R) / 2, mid);
        const [ix, iy] = polar((MID_R + IN_R) / 2, mid);
        const solidOuter = outerTonic || outerPicked;
        const solidInner = innerTonic || innerPicked;

        return (
          <g key={i}>
            <g
              className="cursor-pointer"
              onClick={() => (outer ? onPickDegree(outer.degree) : onPickKey(pc, "major"))}
            >
              <path
                d={ring(MID_R, OUT_R, a0, a1)}
                fill={outerFill}
                fillOpacity={solidOuter ? 1 : outer ? 0.22 : 1}
                stroke={outer ? "var(--color-accent)" : "var(--color-edge)"}
                strokeOpacity={outer ? 0.8 : 1}
                strokeWidth={solidOuter ? 2 : 1}
              />
              <text
                x={ox}
                y={oy + (outer ? 2 : 6)}
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill={solidOuter ? "var(--color-ground)" : outer ? "var(--color-ink)" : "var(--color-ink-faint)"}
              >
                {outer ? outer.chord.symbol : rootName(major)}
              </text>
              {outer && (
                <text
                  x={ox}
                  y={oy + 17}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9"
                  fill={solidOuter ? "var(--color-ground)" : "var(--color-ink-muted)"}
                >
                  {outer.numeral}
                </text>
              )}
            </g>

            <g
              className="cursor-pointer"
              onClick={() =>
                inner ? onPickDegree(inner.degree) : onPickKey((pc + 9) % 12, "minor")
              }
            >
              <path
                d={ring(IN_R, MID_R, a0, a1)}
                fill={innerFill}
                fillOpacity={solidInner ? 1 : inner ? 0.14 : 1}
                stroke={inner ? "var(--color-accent)" : "var(--color-edge)"}
                strokeOpacity={inner ? 0.55 : 1}
                strokeWidth={solidInner ? 2 : 1}
              />
              <text
                x={ix}
                y={iy + (inner ? 0 : 4)}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={solidInner ? "var(--color-ground)" : inner ? "var(--color-ink)" : "var(--color-ink-muted)"}
              >
                {inner ? inner.chord.symbol : relativeMinorName(major)}
              </text>
              {inner && (
                <text
                  x={ix}
                  y={iy + 13}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="8"
                  fill={solidInner ? "var(--color-ground)" : "var(--color-ink-muted)"}
                >
                  {inner.numeral}
                </text>
              )}
            </g>
          </g>
        );
      })}

      <circle cx={CC} cy={CC} r={IN_R - 6} fill="var(--color-ground-lift)" stroke="var(--color-edge)" />
      <text x={CC} y={CC - 8} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-ink)">
        {centreTitle}
      </text>
      <text x={CC} y={CC + 10} textAnchor="middle" fontSize="8.5" letterSpacing="0.16em" fill="var(--color-ink-faint)">
        {centreSub}
      </text>
      <text
        x={CC}
        y={CC + 32}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="12"
        fill="var(--color-accent)"
      >
        {signature}
      </text>
    </svg>
  );
}

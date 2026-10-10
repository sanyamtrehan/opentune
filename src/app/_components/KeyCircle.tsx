"use client";

/**
 * The circle of fifths, drawn from the rule rather than from a poster.
 *
 * Twelve positions, each a fifth above the last, so position i is pitch
 * class (i * 7) % 12 and nothing is typed out. Three rings, which is what
 * a printed circle of fifths actually has:
 *
 *   outer   the major key
 *   middle  its relative minor          (the 6th degree)
 *   inner   its diminished chord        (the 7th degree)
 *
 * Which segments light is **derived from the key's chords**, not assumed.
 * A major triad goes to the outer ring at its root, a minor triad to the
 * middle ring whose relative minor it is, a diminished triad to the inner
 * ring whose leading note it is. An augmented triad has nowhere to go, and
 * that is a real fact about the circle rather than a gap in the drawing:
 * the rings are built from the degrees of a major scale, and no degree of
 * a major scale carries an augmented triad.
 *
 * That derivation is the whole reason this is worth drawing. Major and the
 * modes seat all seven chords inside one unbroken arc of three positions.
 * Harmonic minor seats six and the arc breaks, because its raised seventh
 * is not in any one key signature. Asserting a tidy rule would have been
 * wrong in those cases; counting tells the truth in every one.
 *
 * Deliberately *not* shaped like the CAGED wheel. That one is five uneven
 * wedges with a marker riding the rim and it means fret positions; this is
 * twelve even positions in three rings and means key relationships. A
 * reader who conflates them learns something false, so they are built to
 * look nothing alike and never appear on screen together.
 */

import { rootName } from "@/core/music/chords.ts";
import { midiOf } from "@/core/music/notes.ts";
import type { DiatonicChord } from "@/core/music/scales.ts";
import { scaleNotes, scaleRoot } from "@/core/music/scales.ts";
import type { Note } from "@/core/music/types.ts";

/** Pitch class at each position: a fifth per step, so nothing is tabulated. */
export const pitchClassAt = (index: number) => ((((index % 12) + 12) % 12) * 7) % 12;

/** The position that carries a given major key. */
export const indexOfMajor = (pitchClass: number) => {
  const pc = ((pitchClass % 12) + 12) % 12;
  for (let i = 0; i < 12; i++) if (pitchClassAt(i) === pc) return i;
  return 0;
};

export const pcOf = (note: Note) => ((midiOf(note) % 12) + 12) % 12;

export type Ring = "major" | "minor" | "dim";

/**
 * Which ring and position a chord belongs to.
 *
 * Each ring is a degree of the major scale at that position — the 1st, the
 * 6th and the 7th — so the seat is found by stepping back to the major key
 * that would produce this chord on that degree.
 */
export function seatOf(chord: DiatonicChord): { index: number; ring: Ring } | null {
  const pc = pcOf(chord.chord.root);
  switch (chord.chord.quality) {
    case "major":
      return { index: indexOfMajor(pc), ring: "major" };
    case "minor":
      // The relative minor is three semitones below its major.
      return { index: indexOfMajor(pc + 3), ring: "minor" };
    case "diminished":
      // The leading-note chord is one semitone below its major.
      return { index: indexOfMajor(pc + 1), ring: "dim" };
    default:
      return null;
  }
}

/** What a position's own key calls each of its three rings. */
export function ringLabel(majorTonic: Note, ring: Ring): string {
  if (ring === "major") return rootName(majorTonic);
  const notes = scaleNotes(majorTonic, "major");
  return ring === "minor" ? `${rootName(notes[5])}m` : `${rootName(notes[6])}dim`;
}

const VIEW = 380;
const CC = VIEW / 2;
const R_OUT = 180;
const R_MIN = 134;
const R_DIM = 100;
const R_HUB = 58;
const GAP = 1.6;

const RINGS: { ring: Ring; r0: number; r1: number; size: number; sub: number }[] = [
  { ring: "major", r0: R_MIN, r1: R_OUT, size: 17, sub: 9 },
  { ring: "minor", r0: R_DIM, r1: R_MIN, size: 13, sub: 8 },
  { ring: "dim", r0: R_HUB, r1: R_DIM, size: 10, sub: 7 },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r2(CC + r * Math.cos(a)), r2(CC + r * Math.sin(a))];
}

function ringPath(r0: number, r1: number, a0: number, a1: number): string {
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
  const at = (index: number, ring: Ring) =>
    seats.find((s) => s.seat?.index === index && s.seat.ring === ring)?.chord ?? null;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
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

        return (
          <g key={i}>
            {RINGS.map(({ ring, r0, r1, size, sub }) => {
              const seated = at(i, ring);
              const tonic = seated?.degree === 1;
              const picked = seated?.degree === degree;
              const solid = tonic || picked;
              const [lx, ly] = polar((r0 + r1) / 2, mid);

              /* Amber is the tonic, because that is what a root is everywhere
                 else in this app; accent blue is the rest of the key, which
                 is what a chord tone is. Nothing invents a new colour. */
              const fill = tonic
                ? "var(--color-finger-1)"
                : seated
                  ? "var(--color-accent)"
                  : ring === "major"
                    ? "var(--color-panel-raised)"
                    : "var(--color-panel)";

              return (
                <g
                  key={ring}
                  className="cursor-pointer"
                  onClick={() =>
                    seated
                      ? onPickDegree(seated.degree)
                      : ring === "minor"
                        ? onPickKey((pc + 9) % 12, "minor")
                        : onPickKey(pc, "major")
                  }
                >
                  <path
                    d={ringPath(r0, r1, a0, a1)}
                    fill={fill}
                    fillOpacity={solid ? 1 : seated ? (ring === "major" ? 0.22 : 0.15) : 1}
                    stroke={seated ? "var(--color-accent)" : "var(--color-edge)"}
                    strokeOpacity={seated ? 0.75 : 1}
                    strokeWidth={solid ? 2 : 1}
                  />
                  <text
                    x={lx}
                    y={ly + (seated ? size * 0.1 : size * 0.35)}
                    textAnchor="middle"
                    fontSize={size}
                    fontWeight={ring === "major" ? 700 : 600}
                    fill={
                      solid
                        ? "var(--color-ground)"
                        : seated
                          ? "var(--color-ink)"
                          : ring === "dim"
                            ? "var(--color-ink-ghost)"
                            : "var(--color-ink-faint)"
                    }
                  >
                    {seated ? seated.chord.symbol : ringLabel(major, ring)}
                  </text>
                  {seated && (
                    <text
                      x={lx}
                      y={ly + size * 0.1 + sub + 3}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={sub}
                      fill={solid ? "var(--color-ground)" : "var(--color-ink-muted)"}
                    >
                      {seated.numeral}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      <circle cx={CC} cy={CC} r={R_HUB - 2} fill="var(--color-ground-lift)" stroke="var(--color-edge)" />
      <text x={CC} y={CC - 7} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--color-ink)">
        {centreTitle}
      </text>
      <text x={CC} y={CC + 10} textAnchor="middle" fontSize="8" letterSpacing="0.14em" fill="var(--color-ink-faint)">
        {centreSub}
      </text>
      <text
        x={CC}
        y={CC + 30}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fill="var(--color-accent)"
      >
        {signature}
      </text>
    </svg>
  );
}

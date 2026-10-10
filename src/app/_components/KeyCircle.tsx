"use client";

/**
 * The circle of fifths, drawn from the rule rather than from a poster.
 *
 * Twelve segments, each a fifth above the last, so position i is pitch
 * class (i * 7) % 12 and nothing is typed out. Majors on the outer ring,
 * their relative minors directly inside them.
 *
 * The thing this exists to show is that **the chords of a key are a
 * contiguous block**. Select C and six segments light: C with F and G
 * either side of it — I, IV and V — and Am, Dm and Em sitting directly
 * inside those three — vi, ii and iii. Six of the seven diatonic triads,
 * unbroken, in the same shape in every key. Turn the key and the block
 * rotates rigidly, which is the same lesson the CAGED wheel teaches about
 * its five wedges.
 *
 * The seventh chord, the diminished vii°, has no segment at all. The
 * circle holds majors and minors; vii° is neither. That absence is honest
 * rather than a gap — it is the one chord of the key that does not behave
 * like a neighbour, and the drawing says so by having nowhere to put it.
 *
 * Deliberately *not* shaped like the CAGED wheel. That one is five uneven
 * wedges with a marker riding the rim and it means fret positions; this is
 * twelve even segments in two rings and means key relationships. A reader
 * who conflates them learns something false, so they are built to look
 * nothing alike and never appear on screen together.
 */

import { rootName } from "@/core/music/chords.ts";
import type { DiatonicChord } from "@/core/music/scales.ts";
import { scaleNotes, scaleRoot } from "@/core/music/scales.ts";

/** Pitch class at each position: a fifth per step, so nothing is tabulated. */
export const pitchClassAt = (index: number) => (((index % 12) + 12) % 12) * 7 % 12;

/** Which scale degree each neighbouring segment carries. */
export const OUTER_DEGREE = { "-1": 4, "0": 1, "1": 5 } as const;
export const INNER_DEGREE = { "-1": 2, "0": 6, "1": 3 } as const;

const CC = 170;
const OUT_R = 162;
const MID_R = 116;
const IN_R = 74;
const GAP = 1.6; // degrees of breathing room between segments

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

/**
 * The relative minor of a key, spelled inside that key — D♯m under F♯ major
 * rather than E♭m, because F♯ major is the scale that contains it.
 *
 * Only used for the segments that are *not* part of the chosen key. A lit
 * segment is named by the key it currently belongs to instead, and at the
 * enharmonic seam those two answers genuinely differ: the segment this calls
 * B♭m is A♯m when F♯ major is the key, because F♯ major has no B♭ in it.
 * Naming it from the segment's own key there would put a flat in a scale
 * made of sharps.
 */
export function relativeMinorName(majorTonic: ReturnType<typeof scaleRoot>): string {
  return `${rootName(scaleNotes(majorTonic, "major")[5])}m`;
}

export interface KeyCircleProps {
  keyIndex: number;
  /** The selected key's seven chords, which name every lit segment. */
  chords: DiatonicChord[];
  /** 1-7, which chord of the key is being shown on the neck. */
  degree: number;
  onPickKey: (index: number) => void;
  onPickDegree: (degree: number) => void;
}

export function KeyCircle({ keyIndex, chords, degree, onPickKey, onPickDegree }: KeyCircleProps) {
  const tonic = scaleRoot(pitchClassAt(keyIndex), "major");
  const notes = scaleNotes(tonic, "major");
  const sharps = notes.filter((n) => n.accidental > 0).length;
  const flats = notes.filter((n) => n.accidental < 0).length;
  const signature = sharps ? `${sharps} ♯` : flats ? `${flats} ♭` : "no ♯ or ♭";

  /** Where a segment sits relative to the chosen key: -1, 0, +1, or outside. */
  const offsetOf = (index: number) => {
    const d = ((index - keyIndex + 12) % 12 + 18) % 12 - 6; // -6..5, signed
    return d >= -1 && d <= 1 ? (d as -1 | 0 | 1) : null;
  };

  return (
    <svg
      viewBox="0 0 340 340"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Circle of fifths, ${rootName(tonic)} major selected`}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const a0 = i * 30 - 15 + GAP;
        const a1 = i * 30 + 15 - GAP;
        const mid = i * 30;
        const pc = pitchClassAt(i);
        const major = scaleRoot(pc, "major");
        const offset = offsetOf(i);
        const key = String(offset) as "-1" | "0" | "1";

        const outerDegree = offset === null ? null : OUTER_DEGREE[key];
        const innerDegree = offset === null ? null : INNER_DEGREE[key];
        const outerOn = outerDegree !== null;
        const innerOn = innerDegree !== null;
        const outerPicked = outerOn && outerDegree === degree;
        const innerPicked = innerOn && innerDegree === degree;

        /* The tonic is amber because that is what a root is everywhere else
           in this app; the rest of the neighbourhood is accent blue, which
           is what a chord tone is. Nothing here invents a new colour. */
        const outerFill = outerPicked
          ? outerDegree === 1
            ? "var(--color-finger-1)"
            : "var(--color-accent)"
          : outerOn
            ? "var(--color-accent)"
            : "var(--color-panel-raised)";

        const [ox, oy] = polar((OUT_R + MID_R) / 2, mid);
        const [ix, iy] = polar((MID_R + IN_R) / 2, mid);

        return (
          <g key={i}>
            {/* Outer: the major key. Clicking one that is not lit changes key;
                clicking a lit one picks that chord. */}
            <g
              className="cursor-pointer"
              onClick={() => (outerOn ? onPickDegree(outerDegree) : onPickKey(i))}
            >
              <path
                d={ring(MID_R, OUT_R, a0, a1)}
                fill={outerFill}
                fillOpacity={outerPicked ? 1 : outerOn ? 0.22 : 1}
                stroke={outerOn ? "var(--color-accent)" : "var(--color-edge)"}
                strokeOpacity={outerOn ? 0.8 : 1}
                strokeWidth={outerPicked ? 2 : 1}
              />
              <text
                x={ox}
                y={oy + 6}
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill={outerPicked ? "var(--color-ground)" : outerOn ? "var(--color-ink)" : "var(--color-ink-faint)"}
              >
                {outerOn ? chords[outerDegree - 1].chord.symbol : rootName(major)}
              </text>
              {outerOn && (
                <text
                  x={ox}
                  y={oy + 20}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9"
                  fill={outerPicked ? "var(--color-ground)" : "var(--color-ink-muted)"}
                >
                  {outerDegree === 1 ? "I" : outerDegree === 4 ? "IV" : "V"}
                </text>
              )}
            </g>

            {/* Inner: its relative minor. */}
            <g
              className="cursor-pointer"
              onClick={() => (innerOn ? onPickDegree(innerDegree) : onPickKey(i))}
            >
              <path
                d={ring(IN_R, MID_R, a0, a1)}
                fill={innerPicked ? "var(--color-accent)" : innerOn ? "var(--color-accent)" : "var(--color-panel)"}
                fillOpacity={innerPicked ? 1 : innerOn ? 0.14 : 1}
                stroke={innerOn ? "var(--color-accent)" : "var(--color-edge)"}
                strokeOpacity={innerOn ? 0.55 : 1}
                strokeWidth={innerPicked ? 2 : 1}
              />
              <text
                x={ix}
                y={iy + 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={innerPicked ? "var(--color-ground)" : innerOn ? "var(--color-ink)" : "var(--color-ink-muted)"}
              >
                {innerOn ? chords[innerDegree - 1].chord.symbol : relativeMinorName(major)}
              </text>
              {innerOn && (
                <text
                  x={ix}
                  y={iy + 16}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="8"
                  fill={innerPicked ? "var(--color-ground)" : "var(--color-ink-muted)"}
                >
                  {innerDegree === 6 ? "vi" : innerDegree === 2 ? "ii" : "iii"}
                </text>
              )}
            </g>
          </g>
        );
      })}

      <circle cx={CC} cy={CC} r={IN_R - 6} fill="var(--color-ground-lift)" stroke="var(--color-edge)" />
      <text x={CC} y={CC - 8} textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-ink)">
        {rootName(tonic)}
      </text>
      <text x={CC} y={CC + 10} textAnchor="middle" fontSize="9" letterSpacing="0.18em" fill="var(--color-ink-faint)">
        MAJOR
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

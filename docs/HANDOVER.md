# Handover

Context from the planning conversation that created this repo, written so a
fresh session can pick up without re-deriving any of it.

Architecture decisions and their reasoning live in [AGENTS.md](../AGENTS.md).
**Read that first** — this file covers what it doesn't: how we got here, what
is deliberately not decided yet, and what to do next.

---

## Where the idea came from

The owner plays guitar and uses Tuna (Yousician), Ultimate Guitar and similar.
Those apps ship standard tuning free and paywall every alternate tuning. That
is a business decision, not a technical one — a tuning is an ordered list of
pitches, plain fact, nothing to license.

So: build a good web tuner that gives them all away. Deploy on Vercel, hand it
to other guitarists to test, and use it personally for alternate tunings.

Tuna is the reference for feel and UX. It is not a target for feature parity —
its chord library is out of scope and always has been.

## What v1 is

6-string guitar. Two tuning modes. Preset tunings plus user-defined tunings.
Client-side only — no accounts, no backend, no database.

The owner has a 6-string and can test it personally. That is the reason for the
limit: everything else would be untestable by the person building it. Broaden
only when someone can actually verify it on the instrument.

## What is deferred, and why the distinction matters

Two very different buckets. Do not let them get scoped as one roadmap.

**Bounded — data plus rendering, no new hard technology:**
chord shapes, triads, diatonic harmony, pentatonics, scales, and theory
explanations ("why is C called C, what notes does it contain"). Real work, but
no unknowns. These are the reason AGENTS.md insists on spelled notes.

**Not bounded — a genuinely harder problem:**
playthrough / play-along. Following a player in real time means polyphonic
tracking, note onset detection and timing alignment. That is Yousician's actual
moat and it is substantially harder than tuning. Keep it in its own bucket.

**Also deferred:** 7/8-string, bass, ukulele; song-to-tuning lookup.

That last one is worth a note. The genuinely large and legally messy database
in this space is the song→tuning mapping ("what tuning is this song in?") —
that is Ultimate Guitar's real asset, crowd-sourced, and not something to
scrape. A tuner does not need it. If it is ever wanted, user contribution is
the honest path.

## Decisions already settled

Full reasoning in AGENTS.md. Summary so nothing gets silently reopened:

- `ear` mode ships before `mic` mode — all technical risk is in `mic`
- Notes are spelled (`letter`/`accidental`/`octave`), never 0–11 pitch classes
- A tuning is a `Fretboard`, not a `string[]`
- Tunings are generated from ~15 interval shapes plus a root offset
- A4 reference pitch is a parameter threaded everywhere, never a constant
- `ear` mode uses Karplus-Strong synthesis, not sine, not recorded samples
- `mic` mode uses YIN or MPM, never FFT peak-picking
- The pitch detector is a pure function, testable in Node
- UI says "Custom"/"Auto"; code says `ear`/`mic` — never `custom`

## Open questions — not yet decided

1. **Detection accuracy target.** "Good enough to tune by" (±3 cents, what most
   apps do) or strobe-grade (±0.5 cents, used for intonation setup)? This
   changes the algorithm and the latency budget. Was asked, never answered.
2. **Input sources.** Mic only, or line-in / audio interface too? Affects
   whether device selection and multi-channel handling are needed.
3. **Visual design.** Entirely open. No palette, no needle treatment, no
   layout decided.
4. **PWA timing.** Agreed it should happen early, not scheduled. It matters
   because the real use case is a phone in a rehearsal room with bad wifi.
5. **Ground-truth test corpus.** The Node test harness needs real recordings of
   the owner's guitar — open strings across several tunings — plus synthesised
   harmonic-rich waveforms at exact known frequencies. Roughly an hour of
   recording buys a permanent regression suite. Not yet captured.

## What exists right now

Scaffold and skeleton only. No features are implemented.

- Next.js 16 + React 19 + TypeScript + Tailwind 4, pnpm, builds fully static
- `src/core/` — directory structure and its boundary README
- `src/core/music/types.ts` — types only, no logic. Encodes the spelled-note,
  fretboard and generative-tuning decisions so they cannot be quietly undone
- `AGENTS.md` — architecture decisions, referenced by `CLAUDE.md`

## Suggested next steps

Ear mode, in this order. Each step is testable before the next begins.

1. `core/music` — note↔frequency conversion, with A4 as a parameter. Unit test
   against known values (A4=440, E2≈82.41, and a non-440 reference).
2. `core/tunings` — the interval shapes, and resolution from shape + offset to
   concrete notes. Verify Drop D, DADGAD and Open G come out correct.
3. Karplus-Strong voice in the app layer, wrapping Web Audio.
4. Peg UI — tap a string, hear its pitch. This is a shippable product.
5. User-defined tunings — per-string note picker, persisted locally.

Only then start `mic` mode, beginning with the pure `detectPitch` function and
its Node test harness — not with the AudioWorklet.

## Environment notes

- Remote is `git@github.com-personal:sanyamtrehan/opentune.git`. The alias is
  `github.com-personal` (defined in `~/.ssh/config`), not `github-personal.com`.
- `gh` on this machine is authenticated as a **different** account
  (`samt202410`), while the repo belongs to `sanyamtrehan`. Use plain `git`
  here, not `gh`.
- git identity is set per-repo to `sanyam.sanyam.trehan@gmail.com`, inferred
  from the SSH key comment. If that is not the address on the GitHub account,
  commit attribution will be wrong — verify it.

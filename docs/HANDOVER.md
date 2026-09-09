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

## Open questions

**Decided since the planning conversation:**

1. **Detection accuracy target — ±1 cent.** Tuner-grade, comfortably past the
   ±3 cents most apps manage, without the latency cost of strobe-grade. MPM
   with parabolic interpolation reaches it; the test suite asserts it.
2. **Input sources — mic only.** No device picker, no channel selection. An
   interface still works if it is the system default input.
3. **Visual design — dark, warm, minimal; headstock with pegs.** Amber is the
   only accent and marks the string currently sounding. Palette lives in
   `src/app/globals.css`.
4. **PWA — done**, in the same pass as ear mode rather than after it.

**Still open:**

5. **Ground-truth test corpus.** Synthesised signals are in
   `src/core/audio/test-signals.ts` and the detector is tested against them,
   including the weak- and missing-fundamental cases that break FFT
   peak-picking. What is still missing is *real recordings* of the owner's
   guitar — open strings across several tunings, a few mic positions, a noisy
   room. Synthesis cannot produce the failure modes that matter most. Roughly
   an hour of recording buys a permanent regression suite.

## What exists right now

Both modes are built. Nothing has been verified against a real guitar or a
real microphone yet — see "What is left".

- `src/core/music/` — spelled notes, and note↔frequency with A4 as a parameter
- `src/core/tunings/` — twelve interval patterns generating every preset,
  root-relative spelling, user-defined tunings
- `src/core/audio/` — Karplus-Strong synthesis, the MPM pitch detector, and
  the synthesised signals both are tested against
- `src/core/tunings/target.ts` — which string is being played, and how far off
- `src/app/_components/` — headstock peg UI, needle, mode toggle, tuning
  picker, tuning editor
- `src/app/_audio/` — shared AudioContext, the synth shell, mic capture, and
  the worklet shell that `pnpm worklet` compiles into `public/pitch-worklet.js`
- `src/app/_storage/` — saved tunings in localStorage, as an external store
- PWA: manifest, icons (generated by `pnpm icons`), offline service worker

`pnpm test` runs the whole core suite on Node's built-in runner with no test
framework. That works only because `core/` never touches the DOM.

## What is left

Verification, which is the part that could not be done from a terminal:

1. **Play it.** `pnpm dev`. Nothing in this repo has been seen rendered — the
   headstock drawing, the needle and the layout are asserted only through
   prerendered markup and unit tests.
2. **Point a guitar at it.** Auto mode has never had a real microphone or a
   real string in front of it. The detector is tested hard against synthesised
   signals, but the room, the mic and the attack transient are not synthesised.
3. **Real guitar recordings** for the test harness (see open question 5).
   Until those exist, every claim about `mic` mode accuracy rests on synthesis.
4. **Install it on a phone** and check the offline path with the network off.

## Environment notes

- Remote is `git@github.com-personal:sanyamtrehan/opentune.git`. The alias is
  `github.com-personal` (defined in `~/.ssh/config`), not `github-personal.com`.
- `gh` on this machine is authenticated as a **different** account
  (`samt202410`), while the repo belongs to `sanyamtrehan`. Use plain `git`
  here, not `gh`.
- git identity is set per-repo to `sanyam.sanyam.trehan@gmail.com`, inferred
  from the SSH key comment. If that is not the address on the GitHub account,
  commit attribution will be wrong — verify it.

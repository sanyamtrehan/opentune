<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpenTune

A free, browser-based guitar tuner with full support for alternate tunings.

New to this project? [docs/HANDOVER.md](./docs/HANDOVER.md) has the planning
context, the open questions, and suggested next steps.

## Why this exists

Apps like Tuna (Yousician), Ultimate Guitar and similar put every tuning except
standard behind a subscription. A tuning is just an ordered list of pitches —
plain fact, nothing to license. This app gives all of them away for free, runs
on the web, and works offline.

## Scope

**v1 (current):** 6-string guitar only. Two tuning modes, preset tunings plus
user-defined tunings. No accounts, no backend, no database. Fully client-side.

**Explicitly deferred:** 7/8-string, bass, ukulele, other instruments; music
theory features (scales, triads, diatonic harmony, pentatonics); song-to-tuning
lookup; play-along / playthrough.

## The two tuning modes

Terminology matters here — the UI labels and the internal names differ on
purpose, because "Custom" reads like "user-defined tuning" and would be
confusing in code.

| UI label | Internal name | What it does                                                     |
|----------|---------------|------------------------------------------------------------------|
| Custom   | `ear`         | Tap a peg, app **plays** the target pitch, user tunes by ear.     |
| Auto     | `mic`         | User plucks, app **listens**, needle moves left/right to centre.  |

Never name a module, route, or type `custom` — use `ear` / `mic`.

## Build order (deliberate)

1. **`ear` mode first.** No mic, no DSP, no permissions, no iOS audio
   minefield. It is a complete, useful, shippable product on its own and it
   already solves the paywall grievance — every alternate tuning unlocked.
2. **`mic` mode second.** All the technical risk lives here. Do not let it
   block shipping step 1.

## Architecture decisions

These were settled during planning. Changing them later is expensive.

### `src/core/` is framework-agnostic

No React, no Next.js, no browser APIs, no DOM. Pure TypeScript. Everything in
`core/` must be runnable in plain Node so it can be unit tested directly.

### Notes are spelled, never bare semitone integers

Do **not** model pitch as a 0–11 pitch class. F# and Gb are not the same thing.
Store `{ letter, accidental, octave }`.

The tuner alone does not need this — but the deferred theory roadmap (scales,
diatonic harmony, "why C is called C") is impossible to retrofit onto integers,
because a correct scale has exactly one of each letter A–G. Spelling costs ~30
lines now and a full refactor later.

### A tuning is a fretboard, not a string array

Model it as `Fretboard { strings: Note[], fretCount: number }`, not
`Tuning = string[]`. The tuner only reads `strings`, but chord diagrams, scale
shapes, capo and transposition all fall out of the same object for free later.

### Tunings are generative, not a hand-typed list

Most named tunings are transformations of a few base shapes. Eb/D/C#/C standard
are standard shifted down 1/2/3/4 semitones; Drop C is Drop D shifted down 2.

Model as an interval shape plus a root offset:

```ts
{ id: "drop-d", name: "Drop D", shape: [0, 7, 12, 17, 21, 26], rootOffset: -2 }
```

~15 shapes generate the entire space — including unnamed combinations the paid
apps don't offer. Named presets are curated labels on top of a generative
system, not the system itself.

### Reference pitch A4 is a parameter, never a constant

Must thread through all note↔frequency math from the start (440 default; 432,
442, 415 are real user requests). Trivial now, painful once 440 is hardcoded in
twenty places.

## `ear` mode: use Karplus-Strong, not a sine wave

A pure sine is genuinely hard to tune against — no harmonics means the beat
frequencies the ear relies on are weak.

Karplus-Strong plucked-string synthesis is ~40 lines of Web Audio, sounds
convincingly like a plucked string, produces any frequency exactly, and needs
zero audio assets — which keeps the PWA small and fully offline. Recorded
samples sound marginally better but fight the offline goal.

## `mic` mode: the hard part

Read this before touching pitch detection.

- **Use YIN or MPM (McLeod), not FFT peak-picking.** On guitar the fundamental
  is often weaker than the 2nd/3rd harmonic, so FFT peak-picking produces
  octave errors. Time-domain methods also yield a clarity/confidence value,
  which is needed to decide when to show a reading at all.
- **Window size must vary by string.** Reliable detection needs 2–3 periods.
  Low E (~82 Hz) needs a long window; a single fixed window is either sluggish
  on the high strings or unreliable on the low ones.
- **Parabolic interpolation on the autocorrelation peak is required** for ±1
  cent resolution. The raw lag is far too coarse at high frequencies.
- **Disable browser audio processing explicitly.** `getUserMedia` defaults
  `echoCancellation`, `noiseSuppression` and `autoGainControl` to on. All three
  mangle pitch content. This is a silent killer.
- **iOS Safari** needs HTTPS and a user gesture before audio starts.

### The detector must be a pure function

```ts
detectPitch(frame: Float32Array, sampleRate: number): { hz: number; clarity: number }
```

No Web Audio dependency. The AudioWorklet is a thin shell around it.

This exists so the detector can be tested in Node against ground truth —
synthesised harmonic-rich waveforms at exact known frequencies, plus real
recorded guitar samples — asserting cents error and absence of octave errors.
Without that harness the only debugging tool is your ears, which does not catch
regressions.

## Deployment

Vercel. Fully client-side — no server runtime needed. Ship as a **PWA** early:
this gets used on a phone in a rehearsal room with bad wifi, and offline +
add-to-home-screen is what makes it a tool rather than a demo.

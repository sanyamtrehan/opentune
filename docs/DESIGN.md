# Design

The v2 design was produced in Claude Design and exported as a bundled page.
That bundle is unreadable — the real document is an escaped string inside a
178KB JavaScript blob — so the decoded source is kept at
[design/opentune-v2.reference.html](design/opentune-v2.reference.html), and
the values that matter are written out below.

**This file is the contract.** The reference HTML is a mockup: its pitch
detection, its reference tone and its string-following logic are all worse
than what is already in `src/core/`, and none of that was adopted. What was
adopted is the look, the layout and the interaction model.

## Looking at it

`scripts/screenshot.sh 390 844 /tmp/phone.png` against a running `pnpm dev`.

Use it. The whole v2 redesign was built without once rendering the page, and
the result was a layout that split a tall desktop window into two objects
floating in a void — invisible in the markup, obvious in a screenshot.

Note the script loads the app in an iframe. Headless Chrome will not make its
viewport narrower than 500px; ask for 390 and it quietly gives you 500 and
scales the image, which looks exactly like a layout overflowing to the right.
That false reading cost an afternoon.

## Palette

Warm dark. The stated use case is a phone at arm's length in a dim rehearsal
room, and every colour choice follows from that.

| Token                  | Value     | Used for                                  |
|------------------------|-----------|-------------------------------------------|
| `--color-ground`       | `#0A0A0A` | Page                                      |
| `--color-panel`        | `#141414` | Controls, nav, sheet rows                 |
| `--color-panel-raised` | `#181818` | Pegs at rest                              |
| `--color-panel-input`  | `#171717` | Text input, unselected sheet items        |
| `--color-edge`         | `#232323` | Default border                            |
| `--color-edge-strong`  | `#2B2B2B` | Peg ring at rest                          |
| `--color-ink`          | `#F2F2F2` | Primary text                              |
| `--color-ink-muted`    | `#8A8A8A` | Hints, secondary text                     |
| `--color-ink-faint`    | `#6E6E6E` | Labels, A4 readout                        |
| `--color-ink-ghost`    | `#565656` | Disabled nav                              |

Three states, and only three. Nothing else on the screen may use them:

| Token                  | Value     | Meaning                                   |
|------------------------|-----------|-------------------------------------------|
| `--color-accent`       | `#F5A623` | **Active** — the string being tuned        |
| `--color-accent-bright`| `#FFC05C` | Hover / emphasis on active                |
| `--color-accent-bg`    | `#2A1C06` | Active fill                               |
| `--color-accent-edge`  | `#5A3E0C` | Active border                             |
| `--color-tuned`        | `#3FBF7F` | **Tuned** — this string is done            |
| `--color-tuned-bg`     | `#11291D` | Tuned fill                                |
| `--color-warn`         | `#E0714A` | **Too far** — we cannot tell which string  |

Page background is a radial gradient, not flat:
`radial-gradient(130% 70% at 50% 8%, #16130F 0%, #0A0A0A 65%)`.

## Type

- **Space Grotesk** for UI.
- **JetBrains Mono** for anything numeric — cents, frequencies, note names in
  lists, the A4 readout. Numbers that change must not reflow, so tabular
  figures everywhere they animate.
- Section labels: 10px, `letter-spacing: 0.18em`, uppercase, `--color-ink-faint`.

## Layout

Single screen, `100dvh`, nothing scrolls except the tuning sheet.

```
┌─────────────────────────────────────────┐
│ OpenTune  every tuning, free   [nav]    │   header
│ [Custom|Auto]  [ Drop D      A4 440 ▾ ] │   mode + tuning
│                                          │
│              ╭─ needle ─╮                │   dial, pivots at
│         −50  ╰────┬────╯  +50            │   the top of the
│   (E2)      ┌─────┴─────┐      (E4)      │   headstock
│   (A2)      │ headstock │      (B3)      │   pegs overlaid
│   (D3)      └─────┬─────┘      (G3)      │   as buttons
│                fretboard fades out       │
│                                          │
│                D3  +2.4¢                 │   readout
│             Sharp — loosen slowly.       │
│              ● ● ▬ ● ● ●                 │   per-string dots
│   [ Start listening ] [ Hear D3 ]        │
└─────────────────────────────────────────┘
```

At **≥780px** the stage and the controls sit side by side (`row-reverse`:
headstock right, controls left), inside a 1080px centred `main`.

Exact values, because paraphrasing them went wrong once:

| Element  | Narrow                                    | ≥780px                                        |
|----------|-------------------------------------------|-----------------------------------------------|
| `main`   | `flex-col`                                | `row-reverse`, `max-w-1080`, gap `clamp(24,5vw,72)`, pad `clamp(16,4vw,40)` |
| stage    | `flex:1; width:100%; px clamp(12,3vw,24)` | `flex:0 1 auto; height:100%; width:auto; p:0`  |
| aside    | `flex:none; width:100%`                   | `flex:0 1 360px; gap:20`                       |
| controls | `max-w-560`, centred, pad `clamp(16,4vw,28)` | same                                        |

The stage **must** drop `width:100%` in the wide branch. Leaving it on lets
the stage claim the whole row and squeezes the controls column down to its
minimum content width — which is subtle enough on a mockup and obvious the
moment you screenshot it.

### Known rough edges in the design itself

Both of these are reproduced faithfully, and both are visible in
`scripts/screenshot.sh` output against the reference:

- At 390px the tagline wraps onto three lines and the nav wraps "My Chords"
  onto two. The header simply has more in it than fits a phone.
- At 1280x800 the left half of the screen is empty and the headstock runs off
  the bottom edge. The split is gated on width, but the thing that makes a
  headstock not fit is a *short* window, and a desktop browser is tall.

Fixing either is a change to the design, not an implementation bug.

## Headstock geometry

`viewBox="0 0 360 540"`. Body spans y 126–402, nut at y≈398, fretboard runs
off the bottom edge under a fade. Strings, low to high:

| String | Side  | Post y | Nut x | Gauge |
|--------|-------|--------|-------|-------|
| 6 (low)| left  | 344    | 136   | 3.0   |
| 5      | left  | 272    | 153   | 2.6   |
| 4      | left  | 200    | 170   | 2.2   |
| 3      | right | 200    | 190   | 1.8   |
| 2      | right | 272    | 207   | 1.5   |
| 1 (high)| right| 344    | 224   | 1.2   |

Low E bottom-left, high E bottom-right — the outer strings take the posts
nearest the nut. Getting this wrong once already meant people turned the wrong
peg.

## Needle

A dial, not a bar. Pivots at `(180, 130)`, rotates `cents × 1.4` degrees,
clamped to ±70°, so the full ±50 cent scale uses the full sweep. 90ms linear
transition on the transform, and an EMA of 0.35 on the cents value before it
gets there — the raw reading is too jittery to point at.

Past ±100 cents the needle pins to the end and the readout switches to the
warn colour: we do not know which string this is, and must not pretend.

## Tuned state

A string is **tuned** after 700ms continuously within ±4 cents, and loses it
past 10 cents. When it flips, the peg ring, the string itself, the dot and the
readout all go green together — one state change, expressed in four places, so
it is impossible to miss while looking at any of them.

# core

Framework-agnostic domain logic. **No React, no Next.js, no browser APIs, no
DOM.** Everything here must run in plain Node so it can be unit tested without
a browser or an audio device.

- `music/` — notes, intervals, frequency conversion, fretboard model
- `tunings/` — tuning shapes and preset resolution
- `audio/` — pure DSP (pitch detection), taking `Float32Array` frames in and
  returning readings out. The AudioWorklet lives in the app layer and is a thin
  shell around this.

Web Audio glue, React hooks and components belong in `src/app/`, not here.

## Tests

`pnpm test` runs Node's built-in test runner directly over the TypeScript —
no bundler, no jsdom, no test framework dependency. That is only possible
because nothing here touches the DOM, which is the point of the boundary.

Imports inside `core/` carry explicit `.ts` extensions: Node's type stripping
resolves ESM specifiers literally. Turbopack and `tsc` both handle it.

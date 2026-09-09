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

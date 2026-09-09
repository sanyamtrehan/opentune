# OpenTune

A free guitar tuner for the web, with every alternate tuning unlocked.

Most tuning apps ship standard tuning free and put Drop C, DADGAD, Open G and
the rest behind a subscription. A tuning is just an ordered list of pitches —
there is nothing there to license. This gives all of them away.

## Two ways to tune

- **Custom** — tap a peg, hear the target pitch, tune by ear.
- **Auto** — pluck a string, the needle tells you which way to turn.

## Status

Early. v1 targets 6-string guitar with preset and user-defined tunings.

## Stack

Next.js · TypeScript · Tailwind · Web Audio · deployed on Vercel. No backend,
no accounts — everything runs in the browser.

## Development

```bash
pnpm install
pnpm dev
```

## Contributing

Architecture decisions and the reasoning behind them live in
[AGENTS.md](./AGENTS.md). Read it before adding anything to `src/core/`.

## Licence

MIT

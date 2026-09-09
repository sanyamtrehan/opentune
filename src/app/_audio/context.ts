/**
 * The one AudioContext.
 *
 * Both modes share it. Browsers limit how many contexts a page may hold, and
 * iOS in particular is unforgiving, so ownership lives here rather than in
 * whichever feature happened to need audio first.
 */

type AudioContextConstructor = new () => AudioContext;

let context: AudioContext | null = null;

function constructorFor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

/** True when this browser can do Web Audio at all. */
export function isSupported(): boolean {
  return constructorFor() !== null;
}

/**
 * Create and resume the shared context.
 *
 * Must be called from inside a user gesture. iOS Safari starts every context
 * suspended and only a real tap resumes it, so every path that makes or
 * records a sound goes through here first.
 */
export async function unlock(): Promise<AudioContext | null> {
  const Constructor = constructorFor();
  if (!Constructor) return null;
  context ??= new Constructor();
  if (context.state === "suspended") await context.resume();
  return context;
}

/** The context, if one has been created. Never creates one. */
export function currentContext(): AudioContext | null {
  return context;
}

export function closeContext(): void {
  void context?.close();
  context = null;
}

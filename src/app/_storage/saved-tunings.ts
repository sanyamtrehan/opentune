/**
 * Saved tunings in localStorage.
 *
 * There is no backend and there will not be one, so this is the whole
 * persistence story. Everything is defensive: a person can clear site data,
 * run in private mode, or hit a quota, and none of that may take the tuner
 * down — losing saved tunings is bad, but a blank screen is worse.
 */

import { formatNote, parseNote } from "@/core/music/notes.ts";
import type { Note } from "@/core/music/types.ts";
import { validateStrings } from "@/core/tunings/custom.ts";

const KEY = "opentune.tunings.v1";

export interface SavedTuning {
  id: string;
  name: string;
  /** Scientific pitch notation, low string first. Stored as text so the file
   *  is readable if anyone ever inspects it, and so a future spelling change
   *  cannot silently reinterpret it. */
  strings: string[];
}

export interface StoredTuning {
  id: string;
  name: string;
  strings: Note[];
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private mode and blocked-cookie settings throw on access, not on use.
    return null;
  }
}

/** Read every saved tuning. Anything unparseable is dropped, not thrown. */
function readTunings(): StoredTuning[] {
  const store = storage();
  if (!store) return [];

  let raw: string | null;
  try {
    raw = store.getItem(KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const result: StoredTuning[] = [];
  for (const entry of parsed) {
    const candidate = entry as Partial<SavedTuning>;
    if (
      typeof candidate?.id !== "string" ||
      typeof candidate?.name !== "string" ||
      !Array.isArray(candidate.strings) ||
      candidate.strings.length !== 6
    ) {
      continue;
    }
    try {
      const strings = candidate.strings.map((text) => parseNote(String(text)));
      // Validate here rather than at the point of use: everything downstream
      // renders these, and a bad entry must not be able to throw mid-render.
      if (validateStrings(strings) !== null) continue;
      result.push({ id: candidate.id, name: candidate.name, strings });
    } catch {
      // One corrupt entry must not cost the user the rest of their tunings.
    }
  }
  return result;
}

/** Overwrite the saved set. Returns false if storage refused. */
function writeTunings(tunings: StoredTuning[]): boolean {
  const store = storage();
  if (!store) return false;
  const payload: SavedTuning[] = tunings.map((tuning) => ({
    id: tuning.id,
    name: tuning.name,
    strings: tuning.strings.map(formatNote),
  }));
  try {
    store.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/*
 * The store.
 *
 * localStorage is an external system that React cannot see, so this is
 * exposed as a real external store rather than being pulled into state by an
 * effect on mount. That also means the snapshot is read once, not on every
 * render, and every component sees the same list.
 */

let snapshot: StoredTuning[] | null = null;
const listeners = new Set<() => void>();

/** Stable empty array: a new one each call would loop the render. */
const NONE: StoredTuning[] = [];

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): StoredTuning[] {
  snapshot ??= readTunings();
  return snapshot;
}

/** The server has no storage, so it renders as though nothing is saved. */
export function getServerSnapshot(): StoredTuning[] {
  return NONE;
}

function commit(next: StoredTuning[]): boolean {
  snapshot = next;
  const stored = writeTunings(next);
  for (const listener of listeners) listener();
  return stored;
}

/** Add a tuning. Returns false if it could not be persisted. */
export function addTuning(tuning: StoredTuning): boolean {
  return commit([...getSnapshot(), tuning]);
}

/** Remove a tuning by id. Returns false if the removal could not be saved. */
export function removeTuning(id: string): boolean {
  return commit(getSnapshot().filter((tuning) => tuning.id !== id));
}

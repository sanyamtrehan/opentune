"use client";

/**
 * The note, as a sheet you pull up.
 *
 * On a wide screen the note lives beside the diagram and is simply there.
 * A phone has no beside, and the previous answer — put it underneath and
 * let the page scroll — meant the theory was somewhere you had to go
 * looking for, and that scrolling to it took the chord off the screen.
 * Reading what a note is doing while you cannot see where your finger goes
 * is not reading it at all.
 *
 * So on a phone held upright it hangs off the bottom edge with its
 * heading and the notes themselves showing. That is the whole affordance:
 * paper does not stop at the edge of a desk, and a corner poking up is the
 * oldest "there is more here" there is. Tap it and it comes up over the
 * page; tap away, press Escape, or pull the handle and it drops back.
 *
 * Where it does not apply — a desk, or a phone turned sideways with no
 * height to spare — the note simply sits in the page, which is what these
 * classes do by default. The rules are in `globals.css` under
 * `.note-sheet`, because the condition is both narrow *and* tall and that
 * is not a thing a list of class names can say.
 *
 * One element in one place in the tree, moved by class rather than
 * rendered twice — two copies of the note would be two things to keep
 * saying the same thing.
 */

import { useEffect } from "react";
import type { ReactNode } from "react";

export interface NoteSheetProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Named on the tap target, so it says which chord it will explain. */
  label: string;
}

export function NoteSheet({ children, open, onOpenChange, label }: NoteSheetProps) {
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Only on a phone, and only while it is up: on a wide screen the
          note is part of the page, not something over it. */}
      {open && (
        <button
          type="button"
          aria-label="Close the note"
          onClick={() => onOpenChange(false)}
          className="note-sheet__scrim fixed inset-0 z-30 cursor-default bg-ground/70"
        />
      )}

      <div className="note-sheet" data-open={open}>
        {/* Pull-handle and tap target in one. Sits above the note's own
            content so the whole visible strip is pressable, and turns into
            a plain handle once the note is up. */}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close the note" : `What you are holding: ${label}`}
          onClick={() => onOpenChange(!open)}
          className="note-sheet__handle sticky top-0 z-10 w-full cursor-pointer justify-center pb-2"
        >
          {/* Light, not paper-coloured: the handle sits above the note,
              against the page or the scrim, and both are dark. */}
          <span
            aria-hidden="true"
            className="h-1.5 w-12 rounded-full bg-ink-muted"
          />
        </button>

        <div className="relative">
          {children}

          {/* While it is down, the note itself is the button. Nothing to
              aim at, which is the point on a phone. */}
          {!open && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => onOpenChange(true)}
              className="note-sheet__tap absolute inset-0 cursor-pointer"
            />
          )}
        </div>
      </div>
    </>
  );
}

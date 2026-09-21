"use client";

/**
 * App header: the name, and the sections.
 *
 * My Chords is still greyed out — it is a saved-shapes feature that needs
 * the chord library to exist first, and a dead link that navigates nowhere
 * is worse than one that plainly says not yet.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { label: "Tuner", href: "/" },
  { label: "Chords", href: "/chords" },
  { label: "My Chords", href: null },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex flex-none items-center justify-between gap-3 px-[clamp(16px,4vw,28px)] pt-[14px] pb-2">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[18px] font-bold tracking-[-0.02em] min-[560px]:text-[20px]">
          OpenTune
        </span>
        {/* The tagline is the first thing to go. On a phone it wrapped to
            three lines and pushed the header to twice its height, to say
            something the page itself says. */}
        <span className="label-caps hidden min-[560px]:inline">every tuning, free</span>
      </div>

      <nav className="flex gap-1 rounded-full border border-edge bg-panel p-[3px]">
        {SECTIONS.map(({ label, href }) => {
          if (!href) {
            return (
              <button
                key={label}
                type="button"
                disabled
                title={`${label} — coming soon`}
                className="cursor-not-allowed rounded-full px-2.5 py-1.5 text-[12px] whitespace-nowrap text-ink-ghost min-[560px]:px-3"
              >
                {label}
              </button>
            );
          }
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-[12px] whitespace-nowrap transition-colors min-[560px]:px-[14px] ${
                active
                  ? "bg-accent-bg font-medium text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

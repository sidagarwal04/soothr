"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "soothr.safetyHintDismissed";

interface Props {
  /** Shown when this becomes true (typically engine.isPlaying). */
  active: boolean;
}

/**
 * A one-time, dismissible safety nudge surfaced under the breathing orb when
 * the user first plays a sound. Once dismissed, the choice is persisted in
 * localStorage so it doesn't reappear on subsequent visits.
 */
export function SafetyHint({ active }: Props) {
  // Default to true (dismissed) so SSR + first paint don't flash the hint
  // before we know what's in localStorage. The effect below corrects this.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* localStorage disabled in private mode - just dismiss for the session */
    }
    setDismissed(true);
  };

  if (dismissed || !active) return null;

  return (
    <div
      role="note"
      className="above-veil mx-auto mt-5 flex max-w-md items-start gap-3 rounded-2xl glass px-4 py-3 text-left text-[12px] text-white/75 shadow-xl"
    >
      <span aria-hidden className="mt-0.5 text-base text-amber-200/80">
        ☾
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white/90">For little ears</p>
        <p className="mt-0.5 text-white/65">
          Place the device <span className="text-white/85">at least 2 m</span>{" "}
          from the crib. Pediatric guidance suggests keeping the level at the
          baby's ear at or below <span className="text-white/85">50 dB</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss safety note"
        className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

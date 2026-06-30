"use client";

interface Props {
  night: boolean;
  onToggle: () => void;
}

export function NightModeToggle({ night, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={night}
      aria-label="Toggle night dim mode"
      className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {night ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
      {night ? "Wake" : "Dim"}
    </button>
  );
}

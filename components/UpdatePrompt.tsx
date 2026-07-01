"use client";

interface Props {
  onRefresh: () => void;
  onDismiss: () => void;
}

/**
 * A slim banner shown at the top of the screen only for MAJOR updates. Minor
 * updates apply silently in the background, so this never appears for them.
 */
export function UpdatePrompt({ onRefresh, onDismiss }: Props) {
  return (
    <div className="above-veil pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(env(safe-area-inset-top),12px)]">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl glass-strong px-4 py-3 shadow-2xl"
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-glow-lavender to-dusk-500 text-lg text-night-950 shadow-lg"
        >
          ☾
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/90">
            A new version is ready
          </p>
          <p className="truncate text-xs text-white/55">
            Refresh to get the latest Soothr.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/90"
        >
          Later
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-night-900 shadow-md transition-transform active:scale-95"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

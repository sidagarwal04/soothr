"use client";

interface Props {
  playing: boolean;
  currentLabel: string | null;
  volume: number;
  onVolumeChange: (v: number) => void;
  onStop: () => void;
  tunerOpen: boolean;
  onToggleTuner: () => void;
}

/** Convert linear gain 0..1 to dB for the readout (display only). */
function formatGainDb(v: number) {
  if (v <= 0) return "Mute";
  const db = 20 * Math.log10(v);
  return `${db.toFixed(db <= -10 ? 0 : 1)} dB`;
}

export function PlayerBar({
  playing,
  currentLabel,
  volume,
  onVolumeChange,
  onStop,
  tunerOpen,
  onToggleTuner,
}: Props) {
  return (
    <div
      className={`above-veil fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 transition-transform duration-500 ${
        playing ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl glass-strong px-4 py-3 shadow-2xl">
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-night-900 transition-transform active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <rect width="16" height="16" rx="2" fill="currentColor" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium text-white/90">
              {currentLabel ?? "Nothing playing"}
            </p>
            <span className="font-mono text-[10px] tabular-nums text-white/45">
              {formatGainDb(volume)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <VolumeIcon level={volume} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="soothr-slider"
              style={
                {
                  ["--val" as string]: `${Math.round(volume * 100)}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTuner}
          aria-label="Tune sound"
          aria-pressed={tunerOpen}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors ${
            tunerOpen
              ? "bg-white/15 text-white ring-1 ring-white/30"
              : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]"
          }`}
        >
          <TuneIcon />
        </button>
      </div>
    </div>
  );
}

function VolumeIcon({ level }: { level: number }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-white/60"
      aria-hidden
    >
      <path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor" stroke="none" />
      {level > 0.05 && <path d="M16.5 8.5a5 5 0 0 1 0 7" />}
      {level > 0.4 && <path d="M19.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}

function TuneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="10" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

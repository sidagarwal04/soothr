"use client";

import { TIMER_PRESETS } from "@/lib/sounds";

interface Props {
  currentMinutes: number | null;
  endsAt: number | null;
  now: number;
  disabled: boolean;
  onSelect: (minutes: number | null) => void;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SleepTimer({
  currentMinutes,
  endsAt,
  now,
  disabled,
  onSelect,
}: Props) {
  const remaining = endsAt ? endsAt - now : null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/60"
            aria-hidden
          >
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5" />
            <path d="M9 2h6" />
          </svg>
          <h2 className="text-sm font-medium tracking-tight text-white/85">
            Sleep timer
          </h2>
        </div>
        {remaining !== null && remaining > 0 && (
          <span className="font-mono text-xs text-white/65">
            {formatRemaining(remaining)} left
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {TIMER_PRESETS.map((p) => {
          const active = currentMinutes === p.minutes;
          return (
            <button
              key={p.label}
              type="button"
              disabled={disabled && p.minutes !== null}
              onClick={() => onSelect(p.minutes)}
              className={`min-w-[3.25rem] rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                active
                  ? "bg-white text-night-900 shadow-md"
                  : "bg-white/[0.06] text-white/75 hover:bg-white/10"
              } ${disabled && p.minutes !== null ? "opacity-40" : ""}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {disabled && (
        <p className="mt-3 text-xs text-white/40">
          Pick a sound first to arm a timer.
        </p>
      )}
    </div>
  );
}

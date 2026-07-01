"use client";

import type { SoundMeta } from "@/lib/sounds";

interface Props {
  sound: SoundMeta;
  active: boolean;
  onClick: () => void;
}

export function SoundCard({ sound, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl p-1.5 text-center transition-all duration-300 sm:gap-1.5 sm:p-2.5 ${
        active
          ? "glass-strong scale-[1.02] ring-1 ring-white/30"
          : "glass hover:scale-[1.015] hover:bg-white/[0.06] active:scale-[0.98]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${sound.accent} transition-opacity duration-500 ${
          active ? "opacity-100" : "opacity-40 group-hover:opacity-60"
        }`}
      />
      <div
        className={`pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 ${
          active ? "opacity-100" : ""
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18), transparent 60%)",
        }}
      />
      <span
        className={`relative text-2xl transition-transform duration-500 sm:text-3xl ${
          active ? "scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" : ""
        }`}
        aria-hidden
      >
        {sound.emoji}
      </span>
      <span className="relative text-[10px] font-medium leading-tight tracking-tight text-white/90 sm:text-xs">
        {sound.label}
      </span>
      {active && (
        <span className="relative inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.16em] text-white/70 sm:text-[9px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Playing
        </span>
      )}
    </button>
  );
}

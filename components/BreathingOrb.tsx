"use client";

import type { SoundId } from "@/lib/sounds";

interface Props {
  playing: boolean;
  sound: SoundId | null;
}

const HUE_BY_SOUND: Record<SoundId, [string, string]> = {
  white: ["#cfd6ff", "#7f8aff"],
  pink: ["#ffc0d8", "#c170ff"],
  brown: ["#ffd6a8", "#a36a3a"],
  fan: ["#b6e6ff", "#5b78ff"],
  vacuum: ["#d6d6d6", "#6a6a72"],
  hairdryer: ["#ffd6a8", "#d97700"],
  rain: ["#a8e6ff", "#3865d6"],
  stream: ["#b6f0e3", "#1f8a8a"],
  ocean: ["#9ff0d8", "#3d72c4"],
  crickets: ["#c8f7c5", "#2f6e3a"],
  forest: ["#bff0b8", "#2f7e3a"],
  wind: ["#d4ecf5", "#3a7fa0"],
  heartbeat: ["#ffb1c2", "#e0506e"],
  womb: ["#e1b6ff", "#7a3fb8"],
  lullaby: ["#d4b8ff", "#5e3da8"],
  indianLullaby: ["#ffb0d3", "#a83e7a"],
};

export function BreathingOrb({ playing, sound }: Props) {
  const [from, to] = sound
    ? HUE_BY_SOUND[sound]
    : (["#b9a7ff", "#4f44c7"] as const);

  return (
    <div className="relative grid h-56 w-56 place-items-center sm:h-72 sm:w-72">
      {/* Outer halo */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${
          playing ? "opacity-70 animate-breathe-slow" : "opacity-30"
        }`}
        style={{
          background: `radial-gradient(circle, ${from} 0%, transparent 70%)`,
        }}
      />
      {/* Mid ring */}
      <div
        className={`absolute inset-6 rounded-full blur-xl transition-opacity duration-1000 ${
          playing ? "opacity-90 animate-breathe" : "opacity-40"
        }`}
        style={{
          background: `radial-gradient(circle, ${from} 0%, ${to} 70%, transparent 100%)`,
        }}
      />
      {/* Core */}
      <div
        className={`relative h-32 w-32 rounded-full sm:h-40 sm:w-40 ${
          playing ? "animate-breathe" : ""
        }`}
        style={{
          background: `radial-gradient(circle at 30% 30%, white 0%, ${from} 30%, ${to} 90%)`,
          boxShadow: `0 0 80px ${from}88, inset 0 0 40px rgba(255,255,255,0.25)`,
        }}
      />
      {/* Faint orbiting dust */}
      <div className="absolute inset-0 animate-spin-slow opacity-30">
        <div
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/80"
          style={{ boxShadow: "0 0 8px white" }}
        />
        <div
          className="absolute bottom-2 right-6 h-1 w-1 rounded-full bg-white/70"
          style={{ boxShadow: "0 0 6px white" }}
        />
      </div>
    </div>
  );
}

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
    <div
      className={`relative grid h-36 w-36 place-items-center sm:h-52 sm:w-52 ${
        playing ? "animate-sway" : ""
      }`}
    >
      {/* Sound-wave ripples emanating outward while playing */}
      {playing && (
        <>
          <span
            className="absolute inset-5 rounded-full border animate-ripple"
            style={{ borderColor: `${from}66` }}
          />
          <span
            className="absolute inset-5 rounded-full border animate-ripple [animation-delay:1.7s]"
            style={{ borderColor: `${from}66` }}
          />
        </>
      )}

      {/* Outer halo */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${
          playing ? "opacity-70 animate-breathe-slow" : "opacity-30"
        }`}
        style={{
          background: `radial-gradient(circle, ${from} 0%, transparent 70%)`,
        }}
      />

      {/* Pulsing glow bloom behind the core */}
      <div
        className={`absolute inset-6 rounded-full blur-2xl transition-opacity duration-1000 ${
          playing ? "opacity-80 animate-pulse-soft" : "opacity-0"
        }`}
        style={{
          background: `radial-gradient(circle, ${from} 0%, transparent 70%)`,
        }}
      />

      {/* Mid ring */}
      <div
        className={`absolute inset-4 rounded-full blur-xl transition-opacity duration-1000 ${
          playing ? "opacity-90 animate-breathe" : "opacity-40"
        }`}
        style={{
          background: `radial-gradient(circle, ${from} 0%, ${to} 70%, transparent 100%)`,
        }}
      />

      {/* Core */}
      <div
        className={`relative h-20 w-20 overflow-hidden rounded-full sm:h-28 sm:w-28 ${
          playing ? "animate-breathe" : ""
        }`}
        style={{
          background: `radial-gradient(circle at 30% 30%, white 0%, ${from} 30%, ${to} 90%)`,
          boxShadow: `0 0 80px ${from}88, inset 0 0 40px rgba(255,255,255,0.25)`,
        }}
      >
        {/* Rotating light sweep for a living, shimmering surface */}
        {playing && (
          <div
            className="absolute inset-0 animate-spin-fast mix-blend-screen"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${from}cc 55deg, transparent 130deg, transparent 360deg)`,
            }}
          />
        )}
      </div>

      {/* Orbiting dust — brighter and faster while playing */}
      <div
        className={`absolute inset-0 animate-spin-slow transition-opacity duration-1000 ${
          playing ? "opacity-70" : "opacity-30"
        }`}
      >
        <div
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/80"
          style={{ boxShadow: "0 0 8px white" }}
        />
        <div
          className="absolute bottom-2 right-6 h-1 w-1 rounded-full bg-white/70"
          style={{ boxShadow: "0 0 6px white" }}
        />
      </div>

      {/* Second dust layer orbiting the other way, only while playing */}
      {playing && (
        <div className="absolute inset-0 animate-spin-reverse opacity-60">
          <div
            className="absolute left-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-white/70"
            style={{ boxShadow: "0 0 6px white" }}
          />
          <div
            className="absolute right-4 top-3 h-1 w-1 rounded-full bg-white/60"
            style={{ boxShadow: "0 0 5px white" }}
          />
        </div>
      )}
    </div>
  );
}

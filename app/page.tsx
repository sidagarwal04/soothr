"use client";

import { useEffect, useState } from "react";
import { useAudioEngine } from "@/lib/useAudioEngine";
import { useWakeLock } from "@/lib/useWakeLock";
import { SOUNDS } from "@/lib/sounds";
import { BreathingOrb } from "@/components/BreathingOrb";
import { SoundCard } from "@/components/SoundCard";
import { PlayerBar } from "@/components/PlayerBar";
import { SleepTimer } from "@/components/SleepTimer";
import { NightModeToggle } from "@/components/NightModeToggle";

export default function HomePage() {
  const engine = useAudioEngine();
  const [night, setNight] = useState(false);

  useWakeLock(engine.isPlaying);

  useEffect(() => {
    document.documentElement.dataset.night = night ? "on" : "off";
  }, [night]);

  // Exit night mode on any tap inside the dim veil.
  useEffect(() => {
    if (!night) return;
    const onTap = () => setNight(false);
    window.addEventListener("pointerdown", onTap, { once: true });
    return () => window.removeEventListener("pointerdown", onTap);
  }, [night]);

  const currentSound = SOUNDS.find((s) => s.id === engine.current) ?? null;

  return (
    <main className="relative min-h-[100dvh] pb-44">
      <header className="above-veil mx-auto flex max-w-4xl items-center justify-between px-5 pt-7 sm:pt-10">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-glow-lavender to-dusk-500 blur-md opacity-70" />
            <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-glow-lavender to-dusk-500 text-night-950 text-lg font-bold shadow-lg">
              ☾
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Soothr</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              For little ones
            </p>
          </div>
        </div>
        <NightModeToggle night={night} onToggle={() => setNight((n) => !n)} />
      </header>

      <section className="above-veil mx-auto mt-6 flex max-w-4xl flex-col items-center px-5 sm:mt-10">
        <BreathingOrb playing={engine.isPlaying} sound={engine.current} />
        <p className="mt-6 text-center text-balance text-sm text-white/55 sm:text-base">
          {engine.isPlaying && currentSound ? (
            <>
              <span className="text-white/85">{currentSound.label}</span>
              {" — "}
              {currentSound.description}
            </>
          ) : (
            "Pick a sound below. It will loop gently until you stop it."
          )}
        </p>
      </section>

      <section className="above-veil mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 px-5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {SOUNDS.map((s) => (
          <SoundCard
            key={s.id}
            sound={s}
            active={engine.current === s.id}
            onClick={() => engine.toggle(s.id)}
          />
        ))}
      </section>

      <section className="above-veil mx-auto mt-8 max-w-4xl px-5">
        <SleepTimer
          currentMinutes={engine.timerMinutes}
          endsAt={engine.timerEndsAt}
          now={engine.now}
          disabled={!engine.isPlaying}
          onSelect={engine.setTimer}
        />
      </section>

      <PlayerBar
        playing={engine.isPlaying}
        currentLabel={currentSound?.label ?? null}
        volume={engine.volume}
        onVolumeChange={engine.setVolume}
        onStop={engine.stop}
      />
    </main>
  );
}

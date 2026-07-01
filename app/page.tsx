"use client";

import { useCallback, useEffect, useState } from "react";
import { useAudioEngine } from "@/lib/useAudioEngine";
import { useWakeLock } from "@/lib/useWakeLock";
import { useMediaSession } from "@/lib/useMediaSession";
import { SOUNDS } from "@/lib/sounds";
import { BreathingOrb } from "@/components/BreathingOrb";
import { SoundCard } from "@/components/SoundCard";
import { PlayerBar } from "@/components/PlayerBar";
import { SleepTimer } from "@/components/SleepTimer";
import { NightModeToggle } from "@/components/NightModeToggle";
import { SoundTuner } from "@/components/SoundTuner";
import { SafetyHint } from "@/components/SafetyHint";
import { DebugOverlay } from "@/components/DebugOverlay";

export default function HomePage() {
  const engine = useAudioEngine();
  const [night, setNight] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [debug, setDebug] = useState(false);

  // Debug overlay: ?debug=1 turns it on (and persists so it survives inside the
  // installed PWA, where you can't edit the URL); ?debug=0 turns it off.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debug")) {
      const on = params.get("debug") !== "0";
      try {
        localStorage.setItem("soothr.debug", on ? "1" : "0");
      } catch {
        /* ignore */
      }
      setDebug(on);
      return;
    }
    try {
      setDebug(localStorage.getItem("soothr.debug") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useWakeLock(engine.isPlaying);

  const handleMediaPlay = useCallback(() => {
    const id = engine.current ?? engine.lastPlayed;
    if (id) engine.play(id);
  }, [engine]);

  useMediaSession({
    currentSound:
      SOUNDS.find((s) => s.id === (engine.current ?? engine.lastPlayed)) ??
      null,
    isPlaying: engine.isPlaying,
    onPlay: handleMediaPlay,
    onPause: engine.mediaPause,
    onStop: engine.stop,
  });

  useEffect(() => {
    document.documentElement.dataset.night = night ? "on" : "off";
  }, [night]);

  // Exit night mode when the user taps the dim background. Taps on
  // interactive controls (everything is promoted with .above-veil) are
  // ignored so the player keeps working in dim mode and so the Wake button
  // isn't double-triggered (its own onClick toggles night off; the global
  // handler used to fire in the same batch and flip it back on).
  useEffect(() => {
    if (!night) return;
    const onTap = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".above-veil")) return;
      setNight(false);
    };
    window.addEventListener("pointerdown", onTap);
    return () => window.removeEventListener("pointerdown", onTap);
  }, [night]);

  const currentSound = SOUNDS.find((s) => s.id === engine.current) ?? null;

  return (
    <main
      className={`relative flex h-[100dvh] flex-col overflow-hidden ${
        engine.isPlaying
          ? "pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
          : ""
      }`}
    >
      <header className="above-veil mx-auto flex w-full max-w-4xl shrink-0 items-center justify-between px-5 pt-5 sm:pt-7">
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

      <section className="above-veil mx-auto mt-3 flex w-full max-w-4xl shrink-0 flex-col items-center px-5 sm:mt-5">
        <div className="[@media(max-height:640px)]:hidden">
          <BreathingOrb
            playing={engine.isPlaying && !engine.interrupted}
            sound={engine.current}
          />
        </div>
        <p className="text-center text-balance text-sm text-white/55 sm:text-base [@media(max-height:640px)]:mt-0 [@media(min-height:641px)]:mt-4">
          {engine.interrupted && currentSound ? (
            <span className="text-white/80">
              Paused for a call — {currentSound.label} resumes when it ends.
            </span>
          ) : engine.isPlaying && currentSound ? (
            <>
              <span className="text-white/85">{currentSound.label}</span>
              {" — "}
              {currentSound.description}
            </>
          ) : (
            "Pick a sound below. It will loop gently until you stop it."
          )}
        </p>
        <SafetyHint active={engine.isPlaying} />
      </section>

      <section className="above-veil mx-auto my-3 flex w-full min-h-0 max-w-4xl flex-1 px-5 sm:my-4">
        <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 md:grid-cols-8 md:grid-rows-2">
          {SOUNDS.map((s) => (
            <SoundCard
              key={s.id}
              sound={s}
              active={engine.current === s.id}
              onClick={() => engine.toggle(s.id)}
            />
          ))}
        </div>
      </section>

      <section className="above-veil mx-auto w-full max-w-4xl shrink-0 px-5">
        <SleepTimer
          currentMinutes={engine.timerMinutes}
          endsAt={engine.timerEndsAt}
          now={engine.now}
          disabled={!engine.isPlaying}
          onSelect={engine.setTimer}
        />
      </section>

      <SoundTuner
        open={tunerOpen && engine.isPlaying}
        lowPass={engine.lowPass}
        lowShelf={engine.lowShelf}
        highShelf={engine.highShelf}
        onLowPassChange={engine.setLowPass}
        onLowShelfChange={engine.setLowShelf}
        onHighShelfChange={engine.setHighShelf}
        onReset={engine.resetTuning}
      />

      <PlayerBar
        playing={engine.isPlaying}
        currentLabel={currentSound?.label ?? null}
        volume={engine.volume}
        onVolumeChange={engine.setVolume}
        onStop={engine.stop}
        tunerOpen={tunerOpen}
        onToggleTuner={() => setTunerOpen((o) => !o)}
      />

      {debug && <DebugOverlay read={engine.getDebug} />}
    </main>
  );
}

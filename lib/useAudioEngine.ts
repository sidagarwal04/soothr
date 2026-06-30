"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioEngine } from "./audioEngine";
import type { SoundId } from "./sounds";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [current, setCurrent] = useState<SoundId | null>(null);
  const [volume, setVolumeState] = useState(0.5);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (typeof window !== "undefined" && !engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  const play = useCallback((id: SoundId) => {
    engineRef.current?.play(id);
    setCurrent(id);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setCurrent(null);
    setTimerEndsAt(null);
  }, []);

  const toggle = useCallback(
    (id: SoundId) => {
      if (current === id) stop();
      else play(id);
    },
    [current, play, stop],
  );

  const setVolume = useCallback((v: number) => {
    engineRef.current?.setVolume(v);
    setVolumeState(v);
  }, []);

  const setTimer = useCallback(
    (minutes: number | null) => {
      engineRef.current?.setSleepTimer(minutes);
      setTimerMinutes(minutes);
      setTimerEndsAt(minutes && current ? Date.now() + minutes * 60_000 : null);
    },
    [current],
  );

  // Tick once per second so the countdown re-renders.
  useEffect(() => {
    if (!timerEndsAt) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [timerEndsAt]);

  // When timer fires, clear the UI state.
  useEffect(() => {
    if (!timerEndsAt) return;
    if (now >= timerEndsAt) {
      setCurrent(null);
      setTimerEndsAt(null);
      setTimerMinutes(null);
    }
  }, [now, timerEndsAt]);

  return {
    current,
    isPlaying: current !== null,
    volume,
    setVolume,
    play,
    stop,
    toggle,
    timerMinutes,
    timerEndsAt,
    setTimer,
    now,
  };
}

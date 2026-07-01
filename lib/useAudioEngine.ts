"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AudioEngine,
  DEFAULT_VOLUME,
  DEFAULT_LOW_PASS_HZ,
  DEFAULT_LOW_SHELF_DB,
  DEFAULT_HIGH_SHELF_DB,
} from "./audioEngine";
import type { SoundId } from "./sounds";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [current, setCurrent] = useState<SoundId | null>(null);
  const [lastPlayed, setLastPlayed] = useState<SoundId | null>(null);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [lowPass, setLowPassState] = useState(DEFAULT_LOW_PASS_HZ);
  const [lowShelf, setLowShelfState] = useState(DEFAULT_LOW_SHELF_DB);
  const [highShelf, setHighShelfState] = useState(DEFAULT_HIGH_SHELF_DB);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [interrupted, setInterrupted] = useState(false);

  if (typeof window !== "undefined" && !engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  const play = useCallback((id: SoundId) => {
    engineRef.current?.play(id);
    setCurrent(id);
    setLastPlayed(id);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setCurrent(null);
    setTimerEndsAt(null);
  }, []);

  const fadeStop = useCallback(() => {
    engineRef.current?.fadeOutAndStop(2);
    setCurrent(null);
    setTimerEndsAt(null);
  }, []);

  // Lock-screen pause. The engine decides whether it's a deliberate user pause
  // (stop) or a call interruption (keep armed, auto-resume). We mirror whatever
  // it did into React state.
  const mediaPause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.handleMediaPause();
    if (engine.current === null) {
      setCurrent(null);
      setTimerEndsAt(null);
    }
  }, []);

  const toggle = useCallback(
    (id: SoundId) => {
      if (current === id) stop();
      else play(id);
    },
    [current, play, stop],
  );

  const getDebug = useCallback(() => engineRef.current?.getDebugInfo() ?? null, []);

  const setVolume = useCallback((v: number) => {
    engineRef.current?.setVolume(v);
    setVolumeState(v);
  }, []);

  const setLowPass = useCallback((hz: number) => {
    engineRef.current?.setLowPass(hz);
    setLowPassState(hz);
  }, []);

  const setLowShelf = useCallback((db: number) => {
    engineRef.current?.setLowShelf(db);
    setLowShelfState(db);
  }, []);

  const setHighShelf = useCallback((db: number) => {
    engineRef.current?.setHighShelf(db);
    setHighShelfState(db);
  }, []);

  const resetTuning = useCallback(() => {
    engineRef.current?.setLowPass(DEFAULT_LOW_PASS_HZ);
    engineRef.current?.setLowShelf(DEFAULT_LOW_SHELF_DB);
    engineRef.current?.setHighShelf(DEFAULT_HIGH_SHELF_DB);
    setLowPassState(DEFAULT_LOW_PASS_HZ);
    setLowShelfState(DEFAULT_LOW_SHELF_DB);
    setHighShelfState(DEFAULT_HIGH_SHELF_DB);
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

  // Surface call-interruption state to the UI (dim the orb, show "paused").
  useEffect(() => {
    engineRef.current?.setInterruptionListener(setInterrupted);
    return () => engineRef.current?.setInterruptionListener(undefined);
  }, []);

  // Re-arm the AudioContext after it gets suspended or interrupted — on tab
  // background/lock, and (the main case here) after a phone call takes audio
  // focus. A call can leave iOS "suspended" without firing a visibility
  // change, so we also resume on window focus and on the next user gesture.
  useEffect(() => {
    const resume = () => engineRef.current?.resume();
    const onVis = () => {
      if (document.visibilityState === "visible") resume();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("pointerdown", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("pointerdown", resume);
    };
  }, []);

  return {
    current,
    lastPlayed,
    isPlaying: current !== null,
    volume,
    setVolume,
    lowPass,
    setLowPass,
    lowShelf,
    setLowShelf,
    highShelf,
    setHighShelf,
    resetTuning,
    play,
    stop,
    fadeStop,
    mediaPause,
    toggle,
    interrupted,
    getDebug,
    timerMinutes,
    timerEndsAt,
    setTimer,
    now,
  };
}

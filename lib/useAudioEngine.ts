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

  // Re-arm the AudioContext when the tab becomes visible again — iOS can
  // still suspend us under heavy memory pressure even with the keep-alive
  // element, and Android browsers occasionally pause the context on lock.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        engineRef.current?.resume();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
    toggle,
    timerMinutes,
    timerEndsAt,
    setTimer,
    now,
  };
}

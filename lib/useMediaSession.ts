"use client";

import { useEffect } from "react";
import type { SoundMeta } from "./sounds";

interface UseMediaSessionArgs {
  currentSound: SoundMeta | null;
  isPlaying: boolean;
  /** Resume the most recently played sound (lock-screen play button). */
  onPlay: () => void;
  /** Stop with the engine's gentle fade (lock-screen pause button). */
  onPause: () => void;
  /** Stop immediately (lock-screen stop button / hardware stop). */
  onStop: () => void;
}

/**
 * Surface playback state to the OS so lock-screen widgets, AirPods, Bluetooth
 * headsets, car stereos, and the Android notification controls all work. This
 * is the second half of background-playback support — the first half is the
 * silent MediaStream keep-alive in `audioEngine.ts`.
 */
export function useMediaSession({
  currentSound,
  isPlaying,
  onPlay,
  onPause,
  onStop,
}: UseMediaSessionArgs) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    const ms = navigator.mediaSession;

    if (currentSound) {
      try {
        ms.metadata = new MediaMetadata({
          title: currentSound.label,
          artist: "Soothr",
          album: "White Noise for Little Ones",
          artwork: [
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
            },
          ],
        });
      } catch {
        /* MediaMetadata not supported in this UA */
      }
    } else {
      ms.metadata = null;
    }

    ms.playbackState = isPlaying ? "playing" : "paused";

    const setHandler = (
      type: MediaSessionAction,
      handler: (() => void) | null,
    ) => {
      try {
        ms.setActionHandler(type, handler);
      } catch {
        /* unsupported action - ignore */
      }
    };

    setHandler("play", onPlay);
    setHandler("pause", onPause);
    setHandler("stop", onStop);

    return () => {
      setHandler("play", null);
      setHandler("pause", null);
      setHandler("stop", null);
    };
  }, [currentSound, isPlaying, onPlay, onPause, onStop]);
}

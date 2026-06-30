"use client";

import { useEffect, useRef } from "react";

interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
}

interface WakeLockAPI {
  request(type: "screen"): Promise<WakeLockSentinel>;
}

/**
 * Holds a screen wake lock while `active` is true so the phone display does
 * not sleep during nighttime playback. No-ops on browsers without support.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: WakeLockAPI };
    if (!nav.wakeLock) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        if (cancelled) {
          s.release();
          return;
        }
        sentinelRef.current = s;
        s.addEventListener("release", () => {
          sentinelRef.current = null;
        });
      } catch {
        /* user gesture missing or denied — silently skip */
      }
    };

    const release = async () => {
      try {
        await sentinelRef.current?.release();
      } catch {
        /* ignore */
      }
      sentinelRef.current = null;
    };

    if (active) {
      acquire();
      // Re-acquire when the tab becomes visible again.
      const onVisible = () => {
        if (
          document.visibilityState === "visible" &&
          active &&
          !sentinelRef.current
        ) {
          acquire();
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisible);
        release();
      };
    } else {
      release();
    }
  }, [active]);
}

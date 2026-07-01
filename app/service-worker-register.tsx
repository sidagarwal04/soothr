"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UpdatePrompt } from "@/components/UpdatePrompt";

const META_CACHE = "soothr-meta";
const PENDING_MAJOR_KEY = "/__pending_major";
// How often to poll for a new service worker while the app is open.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function ServiceWorkerRegister() {
  const [majorUpdateReady, setMajorUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const userRequestedRefreshRef = useRef(false);

  const refresh = useCallback(() => {
    userRequestedRefreshRef.current = true;
    const worker = waitingWorkerRef.current;
    if (worker) {
      // Ask the waiting worker to activate; we reload on controllerchange.
      worker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }, []);

  const dismiss = useCallback(() => setMajorUpdateReady(false), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let registration: ServiceWorkerRegistration | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Only a MAJOR update leaves a worker in the "waiting" state and marks a
    // pending-major flag in the meta cache. This confirms it before prompting
    // so a minor update caught mid-activation can't trigger a false banner.
    const isMajorPending = async (): Promise<boolean> => {
      if (!("caches" in window)) return false;
      try {
        const cache = await caches.open(META_CACHE);
        const res = await cache.match(PENDING_MAJOR_KEY);
        return !!res;
      } catch {
        return false;
      }
    };

    const offerMajorUpdate = (worker: ServiceWorker | null) => {
      waitingWorkerRef.current = worker;
      setMajorUpdateReady(true);
    };

    // Reload only when the user explicitly accepted a major update. Silent
    // (minor) activations also fire controllerchange, but we ignore those so
    // ongoing playback is never interrupted.
    const onControllerChange = () => {
      if (userRequestedRefreshRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    // A major update that installed while the app is open messages us here.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_MAJOR_UPDATE_WAITING") {
        offerMajorUpdate(registration?.waiting ?? null);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        registration = reg;

        // A major update may already be waiting from a previous session.
        if (reg.waiting && navigator.serviceWorker.controller) {
          if (await isMajorPending()) offerMajorUpdate(reg.waiting);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", async () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller &&
              reg.waiting
            ) {
              // If it's still waiting after install, it's a major update
              // (minor updates skipWaiting and activate themselves).
              if (await isMajorPending()) offerMajorUpdate(reg.waiting);
            }
          });
        });

        // Check for updates now, on every return to the app, and hourly, so
        // minor releases download and activate in the background on their own.
        const check = () => {
          void reg.update().catch(() => {});
        };
        check();
        interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      })
      .catch(() => {
        /* registration is best-effort */
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!majorUpdateReady) return null;
  return <UpdatePrompt onRefresh={refresh} onDismiss={dismiss} />;
}

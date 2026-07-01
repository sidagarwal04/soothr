"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
  ctxState: string;
  keepAlivePaused: boolean | null;
  interrupted: boolean;
  pending: boolean;
  currentId: string | null;
  visibility: string;
  log: string[];
}

interface Props {
  read: () => DebugInfo | null;
}

/**
 * A live diagnostic panel enabled with ?debug=1. Shows the AudioContext state,
 * keep-alive element status, and a rolling log of interruption events so we can
 * see exactly what a device does during a real phone call.
 */
export function DebugOverlay({ read }: Props) {
  const [info, setInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const tick = () => setInfo(read());
    tick();
    const i = setInterval(tick, 400);
    return () => clearInterval(i);
  }, [read]);

  if (!info) return null;

  return (
    <div className="above-veil fixed left-2 top-2 z-[60] max-w-[92vw] rounded-xl bg-black/80 p-3 font-mono text-[10px] leading-tight text-lime-300 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-0.5 text-white/90">
        <span>ctx: <b className="text-lime-300">{info.ctxState}</b></span>
        <span>keepAlivePaused: <b>{String(info.keepAlivePaused)}</b></span>
        <span>interrupted: <b>{String(info.interrupted)}</b></span>
        <span>pending: <b>{String(info.pending)}</b></span>
        <span>vis: <b>{info.visibility}</b></span>
        <span>sound: <b>{info.currentId ?? "none"}</b></span>
      </div>
      <div className="max-h-52 overflow-y-auto whitespace-pre-wrap">
        {info.log.length === 0 ? (
          <span className="text-white/40">no events yet…</span>
        ) : (
          info.log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}

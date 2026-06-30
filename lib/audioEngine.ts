import type { SoundId } from "./sounds";

/**
 * Procedural audio engine. Generates every sound on-the-fly via the Web Audio
 * API, so the app has zero audio assets, works offline, and loops seamlessly
 * forever.
 *
 * A silent MediaStream is routed through an HTMLAudioElement on first context
 * creation. That makes iOS treat the page as "actively playing media", which
 * is the only way to keep an AudioContext alive once a PWA is backgrounded or
 * the screen locks. The same trick keeps OS-level MediaSession controls live.
 */

interface ActiveSound {
  sources: AudioScheduledSourceNode[];
  output: GainNode;
  stop: () => void;
}

interface BuildResult {
  sources: AudioScheduledSourceNode[];
  /** Called when this sound is stopped — used to tear down setIntervals etc. */
  disposers?: Array<() => void>;
}

const FADE = 0.6; // seconds — gentle attack/release so playback feels soft

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private active: ActiveSound | null = null;
  private currentId: SoundId | null = null;
  private lastSoundId: SoundId | null = null;
  private volume = 0.5;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveAudio: HTMLAudioElement | null = null;

  /** Lazily create the AudioContext on first user gesture. */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.initSilentKeepAlive();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /**
   * Plumb a silent looping buffer through a MediaStreamDestination into an
   * <audio> element. This element being "playing" is what convinces iOS to
   * keep our AudioContext running in the background. Best-effort: degrades
   * gracefully on browsers that don't expose MediaStreamAudioDestinationNode.
   */
  private initSilentKeepAlive() {
    if (!this.ctx || this.keepAliveAudio) return;
    try {
      const ctx = this.ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);
      src.start();

      const el = new Audio();
      el.srcObject = dest.stream;
      el.loop = true;
      el.preload = "auto";
      (el as HTMLMediaElement & { playsInline?: boolean }).playsInline = true;
      void el.play().catch(() => {
        /* user gesture missing on first call - retried on next play() */
      });
      this.keepAliveAudio = el;
    } catch {
      /* MediaStream destination unsupported - background play will degrade */
    }
  }

  /**
   * Called when the page becomes visible again. iOS sometimes still suspends
   * the context on lock; this re-arms it. Also re-starts the keep-alive
   * element if iOS paused it during an interruption (incoming call, etc.).
   */
  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    if (this.keepAliveAudio && this.keepAliveAudio.paused) {
      void this.keepAliveAudio.play().catch(() => {});
    }
  }

  get isPlaying() {
    return this.active !== null;
  }

  get current() {
    return this.currentId;
  }

  /** The id most recently played — used by MediaSession's "play" handler. */
  get lastPlayed() {
    return this.lastSoundId;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        this.volume,
        this.ctx.currentTime + 0.05,
      );
    }
  }

  play(id: SoundId) {
    const ctx = this.ensureContext();
    this.stop(true);
    this.currentId = id;
    this.lastSoundId = id;
    if (this.keepAliveAudio?.paused) {
      void this.keepAliveAudio.play().catch(() => {});
    }

    const output = ctx.createGain();
    output.gain.value = 0;
    output.connect(this.master!);

    const sources: AudioScheduledSourceNode[] = [];
    const disposers: Array<() => void> = [];

    const add = (r: BuildResult) => {
      sources.push(...r.sources);
      if (r.disposers) disposers.push(...r.disposers);
    };

    switch (id) {
      case "white":
        add(buildNoise(ctx, output, "white"));
        break;
      case "pink":
        add(buildNoise(ctx, output, "pink"));
        break;
      case "brown":
        add(buildNoise(ctx, output, "brown"));
        break;
      case "fan":
        add(buildFan(ctx, output));
        break;
      case "rain":
        add(buildRain(ctx, output));
        break;
      case "ocean":
        add(buildOcean(ctx, output));
        break;
      case "heartbeat":
        add(buildHeartbeat(ctx, output));
        break;
      case "womb":
        add(buildWomb(ctx, output));
        break;
    }

    output.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);

    const stop = () => {
      const now = ctx.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(0, now + FADE);
      sources.forEach((s) => {
        try {
          s.stop(now + FADE + 0.05);
        } catch {
          /* already stopped */
        }
      });
      disposers.forEach((d) => {
        try {
          d();
        } catch {
          /* ignore */
        }
      });
      setTimeout(() => output.disconnect(), (FADE + 0.2) * 1000);
    };

    this.active = { sources, output, stop };
  }

  stop(immediate = false) {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    if (this.active) {
      this.active.stop();
      this.active = null;
      this.currentId = null;
    }
    if (immediate) {
      // nothing else needed; play() handles the new source
    }
  }

  /** Schedule a graceful fade-out after `minutes` minutes. */
  setSleepTimer(minutes: number | null) {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
    if (minutes === null || !this.active) return;
    const ms = minutes * 60 * 1000;
    this.sleepTimer = setTimeout(() => {
      this.fadeOutAndStop(20);
    }, Math.max(0, ms - 20_000));
  }

  /** Slow fade-out across `seconds` seconds, then stop. */
  fadeOutAndStop(seconds = 5) {
    if (!this.active || !this.ctx) return this.stop();
    const ctx = this.ctx;
    const g = this.active.output.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.0001, now + seconds);
    const toKill = this.active;
    this.active = null;
    this.currentId = null;
    setTimeout(
      () => {
        toKill.sources.forEach((s) => {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        });
        toKill.output.disconnect();
      },
      (seconds + 0.5) * 1000,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                           Noise buffer generators                          */
/* -------------------------------------------------------------------------- */

function makeNoiseBuffer(
  ctx: AudioContext,
  type: "white" | "pink" | "brown",
  seconds = 6,
): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    // Paul Kellet's refined pink-noise filter — cheap and good-sounding.
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
      data[i] = pink * 0.11; // normalize roughly to [-1, 1]
    }
  } else {
    // Brown noise: integrate white noise, clamp, slight leak.
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5; // gain compensation
    }
  }

  // Crossfade buffer ends so the loop is seamless.
  const fadeSamples = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fadeSamples; i++) {
    const t = i / fadeSamples;
    const head = data[i];
    const tail = data[length - fadeSamples + i];
    data[i] = head * t + tail * (1 - t);
    data[length - fadeSamples + i] = data[i];
  }

  return buffer;
}

function buildNoise(
  ctx: AudioContext,
  out: AudioNode,
  type: "white" | "pink" | "brown",
): BuildResult {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, type);
  src.loop = true;
  src.connect(out);
  src.start();
  return { sources: [src] };
}

/* -------------------------------------------------------------------------- */
/*                             Textured soundscapes                           */
/* -------------------------------------------------------------------------- */

function buildFan(ctx: AudioContext, out: AudioNode): BuildResult {
  // Pink noise → low-pass with slow filter wobble + subtle amp modulation.
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, "pink");
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.Q.value = 0.6;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 80;

  // Filter wobble
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);

  src.connect(hp).connect(lp).connect(out);
  src.start();
  lfo.start();
  return { sources: [src, lfo] };
}

function buildRain(ctx: AudioContext, out: AudioNode): BuildResult {
  // Brown bed + filtered white for hiss + droplet bursts using HP-filtered noise.
  const bed = ctx.createBufferSource();
  bed.buffer = makeNoiseBuffer(ctx, "brown");
  bed.loop = true;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.6;
  bed.connect(bedGain).connect(out);

  const hiss = ctx.createBufferSource();
  hiss.buffer = makeNoiseBuffer(ctx, "white");
  hiss.loop = true;
  const hissHP = ctx.createBiquadFilter();
  hissHP.type = "highpass";
  hissHP.frequency.value = 1800;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.08;
  hiss.connect(hissHP).connect(hissGain).connect(out);

  // Droplets: bandpass-filtered white noise with random amplitude bumps.
  const drops = ctx.createBufferSource();
  drops.buffer = makeNoiseBuffer(ctx, "white");
  drops.loop = true;
  const dropBP = ctx.createBiquadFilter();
  dropBP.type = "bandpass";
  dropBP.frequency.value = 2400;
  dropBP.Q.value = 4;
  const dropGain = ctx.createGain();
  dropGain.gain.value = 0.0;
  drops.connect(dropBP).connect(dropGain).connect(out);

  // Schedule droplets in 2-minute chunks, refilled every minute. Pre-scheduling
  // the whole night up front would be 200k+ AudioParam events; chunking keeps
  // startup snappy and works just as well in background tabs where setInterval
  // is throttled to at worst once per minute (we stay one chunk ahead).
  let nextStart = ctx.currentTime + 0.5;
  const scheduleChunk = () => {
    const end = nextStart + 120;
    for (let t = nextStart; t < end; t += 0.04 + Math.random() * 0.18) {
      const amp = Math.random() ** 2 * 0.5;
      dropGain.gain.setValueAtTime(0, t);
      dropGain.gain.linearRampToValueAtTime(amp, t + 0.005);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    }
    nextStart = end;
  };
  scheduleChunk();
  const refill = setInterval(scheduleChunk, 60_000);

  bed.start();
  hiss.start();
  drops.start();
  return {
    sources: [bed, hiss, drops],
    disposers: [() => clearInterval(refill)],
  };
}

function buildOcean(ctx: AudioContext, out: AudioNode): BuildResult {
  // Pink noise gated by a very slow LFO to simulate breaking waves.
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, "pink");
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 800;
  lp.Q.value = 0.7;

  const swell = ctx.createGain();
  swell.gain.value = 0.5;

  // Filter sweep LFO
  const filtLfo = ctx.createOscillator();
  filtLfo.frequency.value = 0.08;
  const filtLfoGain = ctx.createGain();
  filtLfoGain.gain.value = 600;
  filtLfo.connect(filtLfoGain).connect(lp.frequency);

  // Amplitude LFO for waves
  const ampLfo = ctx.createOscillator();
  ampLfo.frequency.value = 0.09;
  const ampLfoGain = ctx.createGain();
  ampLfoGain.gain.value = 0.35;
  // Centre the LFO around 0.5 by adding via DC offset trick (constant src).
  const dc = ctx.createConstantSource();
  dc.offset.value = 0.55;
  dc.connect(swell.gain);
  ampLfo.connect(ampLfoGain).connect(swell.gain);

  src.connect(lp).connect(swell).connect(out);
  src.start();
  filtLfo.start();
  ampLfo.start();
  dc.start();
  return { sources: [src, filtLfo, ampLfo, dc] };
}

function buildHeartbeat(ctx: AudioContext, out: AudioNode): BuildResult {
  // Synthesize lub-dub at ~60 bpm using a low sine with a fast envelope.
  // Events are queued in 2-minute chunks and refilled every minute via
  // setInterval so a sleep timer of any length works correctly.
  const bpm = 60;
  const beat = 60 / bpm;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(out);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 60;
  osc.connect(gain);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 35;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.6;
  sub.connect(subGain).connect(gain);

  const thump = (t: number, amp: number) => {
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(amp, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  };

  let nextStart = ctx.currentTime + 0.2;
  const scheduleChunk = () => {
    const end = nextStart + 120;
    for (let t = nextStart; t < end; t += beat) {
      thump(t, 0.9); // lub
      thump(t + 0.32, 0.55); // dub
    }
    nextStart = end;
  };
  scheduleChunk();
  const refill = setInterval(scheduleChunk, 60_000);

  osc.start();
  sub.start();
  return {
    sources: [osc, sub],
    disposers: [() => clearInterval(refill)],
  };
}

function buildWomb(ctx: AudioContext, out: AudioNode): BuildResult {
  // Brown noise bed (whooshing) + soft low-passed heartbeat layer.
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = makeNoiseBuffer(ctx, "brown");
  whoosh.loop = true;
  const whooshLP = ctx.createBiquadFilter();
  whooshLP.type = "lowpass";
  whooshLP.frequency.value = 500;
  const whooshGain = ctx.createGain();
  whooshGain.gain.value = 0.8;
  whoosh.connect(whooshLP).connect(whooshGain).connect(out);

  // Slow modulation on the whoosh, like blood flow.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.6;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  const dc = ctx.createConstantSource();
  dc.offset.value = 0.7;
  dc.connect(whooshGain.gain);
  lfo.connect(lfoGain).connect(whooshGain.gain);

  // Layered heartbeat — softer than the standalone one.
  const heart = ctx.createGain();
  heart.gain.value = 0;
  const heartLP = ctx.createBiquadFilter();
  heartLP.type = "lowpass";
  heartLP.frequency.value = 120;
  heart.connect(heartLP).connect(out);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 55;
  osc.connect(heart);

  const beat = 60 / 70; // 70 bpm
  let nextStart = ctx.currentTime + 0.2;
  const scheduleChunk = () => {
    const end = nextStart + 120;
    for (let t = nextStart; t < end; t += beat) {
      heart.gain.setValueAtTime(0, t);
      heart.gain.linearRampToValueAtTime(0.4, t + 0.02);
      heart.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      heart.gain.setValueAtTime(0, t + 0.3);
      heart.gain.linearRampToValueAtTime(0.25, t + 0.32);
      heart.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    }
    nextStart = end;
  };
  scheduleChunk();
  const refill = setInterval(scheduleChunk, 60_000);

  whoosh.start();
  lfo.start();
  dc.start();
  osc.start();
  return {
    sources: [whoosh, lfo, dc, osc],
    disposers: [() => clearInterval(refill)],
  };
}

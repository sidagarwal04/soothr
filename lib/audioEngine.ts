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

/** Defaults chosen to be safe for infant ears at typical phone-speaker SPL.
 * The volume default (0.3) is roughly -10 dB of digital gain — about half
 * as loud as max perceptually. The EQ defaults are "flat" so the unfiltered
 * sounds come through unchanged until the user opens the Tune panel. */
export const DEFAULT_VOLUME = 0.3;
export const DEFAULT_LOW_PASS_HZ = 20_000;
export const DEFAULT_LOW_SHELF_DB = 0;
export const DEFAULT_HIGH_SHELF_DB = 0;
export const LOW_SHELF_FREQ_HZ = 250;
export const HIGH_SHELF_FREQ_HZ = 4000;
export const MIN_LOW_PASS_HZ = 500;
export const MAX_LOW_PASS_HZ = 20_000;
export const SHELF_GAIN_RANGE_DB = 12; // ±12 dB

/**
 * Sounds backed by real recordings rather than synthesis. Each is a compact,
 * loudness-normalized, seamlessly-looping clip (~40s) sourced from public-domain
 * (CC0) field recordings — see public/sounds/CREDITS.md. Everything not listed
 * here is still generated procedurally.
 */
export const SAMPLE_URLS: Partial<Record<SoundId, string>> = {
  rain: "/sounds/rain.mp3",
  ocean: "/sounds/ocean.mp3",
  stream: "/sounds/stream.mp3",
  forest: "/sounds/forest.mp3",
  crickets: "/sounds/crickets.mp3",
  wind: "/sounds/wind.mp3",
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private lowPass: BiquadFilterNode | null = null;
  private dcBlock: BiquadFilterNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private active: ActiveSound | null = null;
  private currentId: SoundId | null = null;
  private lastSoundId: SoundId | null = null;
  private volume = DEFAULT_VOLUME;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveAudio: HTMLAudioElement | null = null;
  private sampleCache = new Map<string, AudioBuffer>();

  /** Fetch + decode a recorded loop, caching the decoded buffer by URL so it
   *  only downloads once per session. */
  private async loadSample(url: string): Promise<AudioBuffer> {
    const cached = this.sampleCache.get(url);
    if (cached) return cached;
    const ctx = this.ensureContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    this.sampleCache.set(url, decoded);
    return decoded;
  }

  /** Warm the cache for a sound without playing it (e.g. on hover/tap-intent). */
  preload(id: SoundId) {
    const url = SAMPLE_URLS[id];
    if (url) void this.loadSample(url).catch(() => {});
  }

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

      // Signal chain after master:  lowShelf → highShelf → lowPass → output.
      // All three default to neutral pass-through; the Tune panel adjusts
      // their AudioParams live without rebuilding the graph.
      this.lowShelf = this.ctx.createBiquadFilter();
      this.lowShelf.type = "lowshelf";
      this.lowShelf.frequency.value = LOW_SHELF_FREQ_HZ;
      this.lowShelf.gain.value = DEFAULT_LOW_SHELF_DB;

      this.highShelf = this.ctx.createBiquadFilter();
      this.highShelf.type = "highshelf";
      this.highShelf.frequency.value = HIGH_SHELF_FREQ_HZ;
      this.highShelf.gain.value = DEFAULT_HIGH_SHELF_DB;

      this.lowPass = this.ctx.createBiquadFilter();
      this.lowPass.type = "lowpass";
      this.lowPass.frequency.value = DEFAULT_LOW_PASS_HZ;
      this.lowPass.Q.value = 0.7;

      // Master polish: 20 Hz high-pass strips inaudible DC/subsonic rumble
      // that wastes headroom, and a soft DynamicsCompressor acts as a gentle
      // limiter so EQ boosts or layered sounds can't clip the output.
      this.dcBlock = this.ctx.createBiquadFilter();
      this.dcBlock.type = "highpass";
      this.dcBlock.frequency.value = 20;
      this.dcBlock.Q.value = 0.5;

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -3;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.12;

      this.master
        .connect(this.lowShelf)
        .connect(this.highShelf)
        .connect(this.lowPass)
        .connect(this.dcBlock)
        .connect(this.limiter)
        .connect(this.ctx.destination);

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

  /** Low-pass cutoff in Hz. Lower = more muffled / womb-like. */
  setLowPass(freqHz: number) {
    if (!this.lowPass || !this.ctx) return;
    const safe = Math.max(
      MIN_LOW_PASS_HZ,
      Math.min(MAX_LOW_PASS_HZ, freqHz),
    );
    this.lowPass.frequency.cancelScheduledValues(this.ctx.currentTime);
    this.lowPass.frequency.linearRampToValueAtTime(
      safe,
      this.ctx.currentTime + 0.05,
    );
  }

  /** Bass shelf gain in dB. Boosts/cuts below ~250 Hz. */
  setLowShelf(gainDb: number) {
    if (!this.lowShelf || !this.ctx) return;
    const safe = Math.max(-SHELF_GAIN_RANGE_DB, Math.min(SHELF_GAIN_RANGE_DB, gainDb));
    this.lowShelf.gain.cancelScheduledValues(this.ctx.currentTime);
    this.lowShelf.gain.linearRampToValueAtTime(
      safe,
      this.ctx.currentTime + 0.05,
    );
  }

  /** Treble shelf gain in dB. Boosts/cuts above ~4 kHz. */
  setHighShelf(gainDb: number) {
    if (!this.highShelf || !this.ctx) return;
    const safe = Math.max(-SHELF_GAIN_RANGE_DB, Math.min(SHELF_GAIN_RANGE_DB, gainDb));
    this.highShelf.gain.cancelScheduledValues(this.ctx.currentTime);
    this.highShelf.gain.linearRampToValueAtTime(
      safe,
      this.ctx.currentTime + 0.05,
    );
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

    // Recorded sounds: load the decoded loop asynchronously, then start it and
    // fade in. Guarded so a quick toggle to another sound before the buffer
    // finishes loading won't leave an orphaned source playing.
    const sampleUrl = SAMPLE_URLS[id];
    if (sampleUrl) {
      let stopped = false;
      let bufSource: AudioBufferSourceNode | null = null;

      this.loadSample(sampleUrl)
        .then((buffer) => {
          if (stopped || this.currentId !== id) return;
          bufSource = ctx.createBufferSource();
          bufSource.buffer = buffer;
          bufSource.loop = true;
          bufSource.connect(output);
          bufSource.start();
          const t = ctx.currentTime;
          output.gain.cancelScheduledValues(t);
          output.gain.setValueAtTime(0, t);
          output.gain.linearRampToValueAtTime(1, t + FADE);
        })
        .catch(() => {
          /* network/decoding failure — sound simply won't start */
        });

      const stopSample = () => {
        stopped = true;
        const now = ctx.currentTime;
        output.gain.cancelScheduledValues(now);
        output.gain.setValueAtTime(output.gain.value, now);
        output.gain.linearRampToValueAtTime(0, now + FADE);
        if (bufSource) {
          try {
            bufSource.stop(now + FADE + 0.05);
          } catch {
            /* already stopped */
          }
        }
        setTimeout(() => output.disconnect(), (FADE + 0.2) * 1000);
      };

      this.active = { sources: [], output, stop: stopSample };
      return;
    }

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
      case "vacuum":
        add(buildVacuum(ctx, output));
        break;
      case "hairdryer":
        add(buildHairDryer(ctx, output));
        break;
      case "rain":
        add(buildRain(ctx, output));
        break;
      case "stream":
        add(buildStream(ctx, output));
        break;
      case "ocean":
        add(buildOcean(ctx, output));
        break;
      case "crickets":
        add(buildCrickets(ctx, output));
        break;
      case "heartbeat":
        add(buildHeartbeat(ctx, output));
        break;
      case "womb":
        add(buildWomb(ctx, output));
        break;
      case "lullaby":
        add(buildLullaby(ctx, output));
        break;
      case "indianLullaby":
        add(buildIndianLullaby(ctx, output));
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

function buildVacuum(ctx: AudioContext, out: AudioNode): BuildResult {
  // Three layers: low rumble (chassis), mid turbulence (airflow), and a
  // sawtooth motor whine with a slow LFO so it "breathes" like a real motor.
  const rumble = ctx.createBufferSource();
  rumble.buffer = makeNoiseBuffer(ctx, "brown");
  rumble.loop = true;
  const rumbleLP = ctx.createBiquadFilter();
  rumbleLP.type = "lowpass";
  rumbleLP.frequency.value = 220;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.45;
  rumble.connect(rumbleLP).connect(rumbleGain).connect(out);

  const turb = ctx.createBufferSource();
  turb.buffer = makeNoiseBuffer(ctx, "white");
  turb.loop = true;
  const turbHP = ctx.createBiquadFilter();
  turbHP.type = "highpass";
  turbHP.frequency.value = 200;
  const turbLP = ctx.createBiquadFilter();
  turbLP.type = "lowpass";
  turbLP.frequency.value = 2400;
  const turbGain = ctx.createGain();
  turbGain.gain.value = 0.5;
  turb.connect(turbHP).connect(turbLP).connect(turbGain).connect(out);

  const whine = ctx.createOscillator();
  whine.type = "sawtooth";
  whine.frequency.value = 220;
  const whineLP = ctx.createBiquadFilter();
  whineLP.type = "lowpass";
  whineLP.frequency.value = 1400;
  const whineGain = ctx.createGain();
  whineGain.gain.value = 0.07;
  whine.connect(whineLP).connect(whineGain).connect(out);

  // Slow LFO breathes the motor pitch ±4 Hz so it doesn't feel sterile.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.28;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain).connect(whine.frequency);

  rumble.start();
  turb.start();
  whine.start();
  lfo.start();
  return { sources: [rumble, turb, whine, lfo] };
}

function buildHairDryer(ctx: AudioContext, out: AudioNode): BuildResult {
  // Brighter and lighter than the vacuum: no chassis rumble, motor tone is
  // higher and filtered through a peakier bandpass for that hair-dryer hiss.
  const turb = ctx.createBufferSource();
  turb.buffer = makeNoiseBuffer(ctx, "white");
  turb.loop = true;
  const turbHP = ctx.createBiquadFilter();
  turbHP.type = "highpass";
  turbHP.frequency.value = 400;
  const turbLP = ctx.createBiquadFilter();
  turbLP.type = "lowpass";
  turbLP.frequency.value = 5500;
  const turbGain = ctx.createGain();
  turbGain.gain.value = 0.6;
  turb.connect(turbHP).connect(turbLP).connect(turbGain).connect(out);

  const whine = ctx.createOscillator();
  whine.type = "sawtooth";
  whine.frequency.value = 460;
  const whineBP = ctx.createBiquadFilter();
  whineBP.type = "bandpass";
  whineBP.frequency.value = 900;
  whineBP.Q.value = 1.4;
  const whineGain = ctx.createGain();
  whineGain.gain.value = 0.05;
  whine.connect(whineBP).connect(whineGain).connect(out);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.42;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain).connect(whine.frequency);

  turb.start();
  whine.start();
  lfo.start();
  return { sources: [turb, whine, lfo] };
}

function buildStream(ctx: AudioContext, out: AudioNode): BuildResult {
  // High-passed white-noise bed for water rush + bandpass "bubble" pops at
  // random intervals so it feels like a real brook, not a hiss.
  const bed = ctx.createBufferSource();
  bed.buffer = makeNoiseBuffer(ctx, "white");
  bed.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6500;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.45;
  bed.connect(hp).connect(lp).connect(bedGain).connect(out);

  const bubble = ctx.createBufferSource();
  bubble.buffer = makeNoiseBuffer(ctx, "white");
  bubble.loop = true;
  const bubbleBP = ctx.createBiquadFilter();
  bubbleBP.type = "bandpass";
  bubbleBP.frequency.value = 2600;
  bubbleBP.Q.value = 5;
  const bubbleGain = ctx.createGain();
  bubbleGain.gain.value = 0;
  bubble.connect(bubbleBP).connect(bubbleGain).connect(out);

  let nextStart = ctx.currentTime + 0.5;
  const scheduleChunk = () => {
    const end = nextStart + 120;
    let t = nextStart;
    while (t < end) {
      const amp = Math.random() ** 2 * 0.35;
      bubbleGain.gain.setValueAtTime(0, t);
      bubbleGain.gain.linearRampToValueAtTime(amp, t + 0.01);
      bubbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      t += 0.15 + Math.random() * 0.4;
    }
    nextStart = end;
  };
  scheduleChunk();
  const refill = setInterval(scheduleChunk, 60_000);

  bed.start();
  bubble.start();
  return {
    sources: [bed, bubble],
    disposers: [() => clearInterval(refill)],
  };
}

function buildCrickets(ctx: AudioContext, out: AudioNode): BuildResult {
  // Four "cricket voices", each a separate bandpass-noise source with its
  // own pitch and chirp cadence. Plus a faint brown-noise nightscape under
  // it so silence between chirps doesn't feel sterile.
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.55;
  masterGain.connect(out);

  const ambient = ctx.createBufferSource();
  ambient.buffer = makeNoiseBuffer(ctx, "brown");
  ambient.loop = true;
  const ambientLP = ctx.createBiquadFilter();
  ambientLP.type = "lowpass";
  ambientLP.frequency.value = 600;
  const ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.12;
  ambient.connect(ambientLP).connect(ambientGain).connect(masterGain);
  ambient.start();

  const sources: AudioScheduledSourceNode[] = [ambient];
  const disposers: Array<() => void> = [];

  for (let i = 0; i < 4; i++) {
    const cricket = ctx.createBufferSource();
    cricket.buffer = makeNoiseBuffer(ctx, "white");
    cricket.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 4300 + Math.random() * 1300;
    bp.Q.value = 22;
    const env = ctx.createGain();
    env.gain.value = 0;
    cricket.connect(bp).connect(env).connect(masterGain);
    cricket.start();
    sources.push(cricket);

    const baseInterval = 0.32 + Math.random() * 0.35;
    let nextChirp = ctx.currentTime + Math.random() * 2;
    const scheduleChunk = () => {
      const end = nextChirp + 120;
      while (nextChirp < end) {
        const t = nextChirp;
        const amp = 0.4 + Math.random() * 0.45;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(amp, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        nextChirp += baseInterval * (0.85 + Math.random() * 0.3);
      }
    };
    scheduleChunk();
    const refill = setInterval(scheduleChunk, 60_000);
    disposers.push(() => clearInterval(refill));
  }

  return { sources, disposers };
}

/* -------------------------------------------------------------------------- */
/*                                  Lullabies                                 */
/* -------------------------------------------------------------------------- */

/**
 * Music-box-style synthesis: a sine fundamental for warmth + a sine an
 * octave above for brightness, each note shaped with a quick attack and
 * long exponential decay so notes ring and bleed into each other gently.
 */
function scheduleMelody(
  ctx: AudioContext,
  out: AudioNode,
  melody: Array<[number, number]>, // [freqHz, beats]
  beatDur: number,
): BuildResult {
  const noteGain = ctx.createGain();
  noteGain.gain.value = 0;
  noteGain.connect(out);

  const fund = ctx.createOscillator();
  fund.type = "sine";
  const fundGain = ctx.createGain();
  fundGain.gain.value = 0.7;
  fund.connect(fundGain).connect(noteGain);

  const high = ctx.createOscillator();
  high.type = "sine";
  const highGain = ctx.createGain();
  highGain.gain.value = 0.25;
  high.connect(highGain).connect(noteGain);

  const totalLoopDur = melody.reduce((s, [, b]) => s + b * beatDur, 0);

  const scheduleLoop = (loopStart: number) => {
    let t = loopStart;
    for (const [freq, beats] of melody) {
      const dur = beats * beatDur;
      fund.frequency.setValueAtTime(freq, t);
      high.frequency.setValueAtTime(freq * 2, t);
      noteGain.gain.setValueAtTime(0, t);
      noteGain.gain.linearRampToValueAtTime(0.35, t + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.92);
      t += dur;
    }
  };

  let nextLoop = ctx.currentTime + 0.3;
  // Pre-fill enough loops to cover a 2-minute look-ahead.
  while (nextLoop < ctx.currentTime + 120) {
    scheduleLoop(nextLoop);
    nextLoop += totalLoopDur;
  }
  const refill = setInterval(() => {
    while (nextLoop < ctx.currentTime + 120) {
      scheduleLoop(nextLoop);
      nextLoop += totalLoopDur;
    }
  }, 60_000);

  fund.start();
  high.start();
  return {
    sources: [fund, high],
    disposers: [() => clearInterval(refill)],
  };
}

function buildLullaby(ctx: AudioContext, out: AudioNode): BuildResult {
  // Twinkle, Twinkle, Little Star in C major.
  const C = 261.63,
    D = 293.66,
    E = 329.63,
    F = 349.23,
    G = 392.0,
    A = 440.0;
  const melody: Array<[number, number]> = [
    [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
    [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
    [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
    [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
    [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
    [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
  ];
  return scheduleMelody(ctx, out, melody, 0.55);
}

function buildIndianLullaby(ctx: AudioContext, out: AudioNode): BuildResult {
  // A simple pentatonic melody in Raga Bhupali — Sa Re Ga Pa Dha (C D E G A),
  // a peaceful evening raga associated with devotion and sleep. No semitones,
  // so it never feels harsh; the phrases sway between Pa (G) and Sa (C).
  const C = 261.63,
    D = 293.66,
    E = 329.63,
    G = 392.0,
    A = 440.0,
    C2 = 523.25;
  const melody: Array<[number, number]> = [
    [G, 1], [A, 1], [G, 1], [E, 1],
    [D, 1], [E, 1], [D, 1], [C, 2],
    [E, 1], [G, 1], [A, 1], [G, 1],
    [E, 1], [D, 1], [E, 1], [C, 2],
    [G, 1], [A, 1], [C2, 1], [A, 1],
    [G, 1], [E, 1], [D, 1], [C, 2],
    [E, 1], [D, 1], [E, 1], [G, 1],
    [E, 1], [D, 1], [C, 1], [C, 2],
  ];
  return scheduleMelody(ctx, out, melody, 0.7);
}

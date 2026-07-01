# Soothr

A calm white-noise PWA for newborns. Designed for one-handed use at 3 AM.

**Live:** https://soothr.netlify.app/

## Why this is unusual

Most sounds are generated live in the browser with the Web Audio API — no audio
files at all. The naturalistic sounds (rain, ocean, stream, forest, crickets,
wind) use a handful of compact, public-domain (CC0) field recordings, trimmed
into seamless ~40s loops. That means:

- Seamless infinite loops (no clipping at loop points)
- Tiny install size (procedural sounds are free; recordings total ~3.4 MB)
- Works completely offline once installed
- Only public-domain (CC0) audio — see [`public/sounds/CREDITS.md`](./public/sounds/CREDITS.md)

## Features

- **16 sounds**:
  - _Synthesized:_ white, pink, brown noise, fan, vacuum, hair dryer, heartbeat,
    womb, lullaby, Indian lullaby
  - _CC0 recordings:_ rain, stream, ocean waves, crickets, forest, wind
- **Tone tuner**: live 3-band EQ (brightness in Hz, bass/treble in dB) per sound
- **Sleep timer**: 15m / 30m / 1h / 2h / 8h / ∞ with gentle 20s fade-out
- **Volume**: a single big slider with a dB readout; tap-stop in the player bar
- **Safe-by-default volume** plus a one-time infant-ear safety hint
- **Night dim mode**: tap moon to dim the screen to near-black. Tap anywhere to wake.
- **Wake lock**: screen stays on while a sound is playing (where supported)
- **Background playback**: lock-screen / Bluetooth controls via the MediaSession API
- **PWA installable**: add to home screen on iOS or Android

## Safety

White noise for infants should be used thoughtfully. Soothr is built with this
in mind:

- **Quieter default volume.** Playback starts at ~30% (roughly −10 dB) rather
  than full blast, and the slider shows a live dB readout.
- **One-time safety hint.** On first play, a dismissible note reminds you to
  place the device **at least 2 m from the crib** and keep the level at the
  baby's ear at or below **~50 dB**, in line with common pediatric guidance.
- **Sleep timer** so audio doesn't run all night unless you choose ∞.

This is general information, not medical advice — follow your pediatrician's
guidance.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Build for production

```bash
npm run build
npm start
```

The service worker only registers in production builds.

### Updates & offline

The app is fully offline-capable: `public/sw.js` precaches the shell and every
sound, and caches hashed build assets on first use.

Updates are handled in two tiers via constants at the top of `public/sw.js`:

- **`BUILD`** — bump on every deploy (any string change). Rotates the cache so
  stale static files (sounds, icon, offline HTML) refresh. These updates install
  and activate silently in the background; the new version is picked up on the
  next launch, with no prompt and no interruption to playback.
- **`APP_MAJOR`** — bump only for a big/breaking release. That release stays in
  the "waiting" state and shows the user a "New version ready — Refresh" banner
  instead of swapping in silently.

Users never need to uninstall/reinstall the PWA.

## Deployment

Deployed on [Netlify](https://soothr.netlify.app/). Netlify auto-detects the
Next.js App Router — no `netlify.toml` is required. Pushes to `main` trigger a
new build and deploy.

## Project structure

```
app/
  layout.tsx                 # Root layout, metadata, fonts
  page.tsx                   # Main screen: sound grid, orb, player, timer
  manifest.ts                # PWA manifest
  icon.svg                   # App icon
  service-worker-register.tsx
  globals.css
components/
  BreathingOrb.tsx           # Decorative animated orb (color per sound)
  SoundCard.tsx              # Sound grid tile
  PlayerBar.tsx              # Stop / volume / tune controls
  SoundTuner.tsx             # 3-band EQ panel (Hz + dB)
  SleepTimer.tsx             # Timer presets
  SafetyHint.tsx             # One-time infant-ear safety note
  NightModeToggle.tsx        # Dim/wake control
lib/
  audioEngine.ts             # Web Audio engine: synthesis + sample playback + EQ
  sounds.ts                  # SoundId union + sound metadata + timer presets
  useAudioEngine.ts          # React hook wrapping the engine
  useMediaSession.ts         # OS-level playback controls
  useWakeLock.ts             # Keep screen awake while playing
public/
  sounds/                    # CC0 audio loops + CREDITS.md
  sw.js                      # Service worker
```

## Adding a sound

1. Add the id to the `SoundId` union and a metadata entry to `SOUNDS` in
   [`lib/sounds.ts`](./lib/sounds.ts).
2. Pick how it's produced:
   - **Synthesized:** write a `build<Name>()` function in
     [`lib/audioEngine.ts`](./lib/audioEngine.ts) and add a `case` in the
     `play()` switch.
   - **Recorded:** drop a seamless loop in `public/sounds/`, add it to
     `SAMPLE_URLS` in the engine, and credit the source in
     [`public/sounds/CREDITS.md`](./public/sounds/CREDITS.md). Use only
     CC0 / public-domain audio.
3. Add an orb color in `HUE_BY_SOUND` in
   [`components/BreathingOrb.tsx`](./components/BreathingOrb.tsx).
4. Keep the total sound count divisible by the grid columns (2 and 4) so the
   grid stays even.

## Browser support

Targets modern evergreen browsers. The Web Audio API and MediaSession are
broadly supported; Wake Lock and background playback behavior vary by platform
(iOS requires installing to the Home Screen for reliable background audio).

## Tech

- Next.js 15.5 (App Router) + React 19
- TypeScript
- Tailwind CSS
- Web Audio API (procedural synthesis + sample playback of CC0 loops)
- MediaSession API for OS-level playback controls
- Web App Manifest + Service Worker

## Design notes

- Color palette is deep navy / dusk-purple with soft pastel halos — designed
  to be glanceable in a dark nursery without blinding you.
- The breathing orb is purely decorative but gives caregivers something calm
  to look at while rocking.
- Tap targets are large (≥44px) for fumbly one-handed use.
- Volume slider thumb is oversized for the same reason.

## Roadmap ideas

- Multi-sound mixing (e.g. heartbeat + ocean at different volumes)
- Custom favorites / quick-start last used sound
- Cry detection auto-restart (mic permission required)
- Schedule for nap times

## License

[MIT](./LICENSE) © Siddhant Agarwal

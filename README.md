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

## Tech

- Next.js 15 (App Router) + React 19
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

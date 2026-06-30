# Soothr

A calm white-noise PWA for newborns. Designed for one-handed use at 3 AM.

## Why this is unusual

Every sound is generated live in the browser with the Web Audio API — there
are **zero audio files**. That means:

- Truly seamless infinite loops (no clipping at loop points)
- Tiny install size (a few hundred KB)
- Works completely offline once installed
- No third-party rights / no licensing to worry about

## Features (MVP)

- **8 sounds**: pink, brown, white noise, fan, rain, ocean waves, heartbeat, womb
- **Sleep timer**: 15m / 30m / 1h / 2h / 8h / ∞ with gentle 20s fade-out
- **Volume**: a single big slider; tap-stop in the player bar
- **Night dim mode**: tap moon to dim the screen to near-black. Tap anywhere to wake.
- **Wake lock**: screen stays on while a sound is playing (where supported)
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
- Web Audio API (procedural sound synthesis)
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

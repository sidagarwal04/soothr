export type SoundId =
  | "white"
  | "pink"
  | "brown"
  | "fan"
  | "rain"
  | "ocean"
  | "heartbeat"
  | "womb";

export interface SoundMeta {
  id: SoundId;
  label: string;
  description: string;
  emoji: string;
  accent: string;
}

export const SOUNDS: SoundMeta[] = [
  {
    id: "pink",
    label: "Pink Noise",
    description: "Softer than white. Studies suggest it deepens sleep.",
    emoji: "✿",
    accent: "from-pink-400/30 to-purple-500/20",
  },
  {
    id: "brown",
    label: "Brown Noise",
    description: "Deep, rumbly, womb-like. Many babies love this one.",
    emoji: "◉",
    accent: "from-amber-700/30 to-orange-900/20",
  },
  {
    id: "white",
    label: "White Noise",
    description: "Classic static hush. Masks household noise well.",
    emoji: "✦",
    accent: "from-slate-300/30 to-slate-500/20",
  },
  {
    id: "fan",
    label: "Fan",
    description: "Steady whir, like a bedroom fan on low.",
    emoji: "✺",
    accent: "from-sky-400/30 to-indigo-500/20",
  },
  {
    id: "rain",
    label: "Rain",
    description: "Gentle pattering rainfall on a window.",
    emoji: "❅",
    accent: "from-cyan-400/30 to-blue-600/20",
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    description: "Slow swells, like the shore at dusk.",
    emoji: "～",
    accent: "from-teal-400/30 to-blue-700/20",
  },
  {
    id: "heartbeat",
    label: "Heartbeat",
    description: "Mama's heartbeat at a calm 60 bpm.",
    emoji: "♡",
    accent: "from-rose-400/30 to-red-600/20",
  },
  {
    id: "womb",
    label: "Womb",
    description: "Whooshing blood flow with a soft heartbeat.",
    emoji: "◐",
    accent: "from-purple-400/30 to-fuchsia-700/20",
  },
];

export const TIMER_PRESETS: { label: string; minutes: number | null }[] = [
  { label: "∞", minutes: null },
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "8h", minutes: 480 },
];

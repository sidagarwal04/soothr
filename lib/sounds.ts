export type SoundId =
  | "white"
  | "pink"
  | "brown"
  | "shush"
  | "fan"
  | "vacuum"
  | "hairdryer"
  | "rain"
  | "stream"
  | "ocean"
  | "crickets"
  | "forest"
  | "wind"
  | "heartbeat"
  | "womb"
  | "lullaby"
  | "indianLullaby";

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
    id: "shush",
    label: "Shush",
    description: "Rhythmic 'shhhhh' bursts — the way a parent settles a fuss.",
    emoji: "≋",
    accent: "from-indigo-300/30 to-blue-500/20",
  },
  {
    id: "fan",
    label: "Fan",
    description: "Steady whir, like a bedroom fan on low.",
    emoji: "✺",
    accent: "from-sky-400/30 to-indigo-500/20",
  },
  {
    id: "vacuum",
    label: "Vacuum",
    description: "Steady motor hum. Many babies drift off within seconds.",
    emoji: "⊙",
    accent: "from-zinc-400/30 to-stone-600/20",
  },
  {
    id: "hairdryer",
    label: "Hair Dryer",
    description: "Warmer, higher-pitched motor — gentler than a vacuum.",
    emoji: "✧",
    accent: "from-orange-300/30 to-amber-600/20",
  },
  {
    id: "rain",
    label: "Rain",
    description: "Gentle, steady rainfall — a real field recording.",
    emoji: "❅",
    accent: "from-cyan-400/30 to-blue-600/20",
  },
  {
    id: "stream",
    label: "Stream",
    description: "A trickling brook with distant birdsong.",
    emoji: "≈",
    accent: "from-cyan-300/30 to-teal-600/20",
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    description: "Waves rolling onto a calm beach.",
    emoji: "～",
    accent: "from-teal-400/30 to-blue-700/20",
  },
  {
    id: "crickets",
    label: "Crickets",
    description: "A warm summer night of chirping crickets.",
    emoji: "✣",
    accent: "from-emerald-400/30 to-green-700/20",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Birdsong in a peaceful woodland morning.",
    emoji: "❧",
    accent: "from-green-400/30 to-emerald-700/20",
  },
  {
    id: "wind",
    label: "Wind",
    description: "Soft wind drifting through the trees.",
    emoji: "❋",
    accent: "from-slate-300/30 to-cyan-700/20",
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
  {
    id: "lullaby",
    label: "Lullaby",
    description: "Twinkle, Twinkle, Little Star on a soft music box.",
    emoji: "♫",
    accent: "from-violet-400/30 to-purple-700/20",
  },
  {
    id: "indianLullaby",
    label: "Indian Lullaby",
    description: "A peaceful melody in Raga Bhupali, gentle and swaying.",
    emoji: "♪",
    accent: "from-rose-400/30 to-fuchsia-700/20",
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

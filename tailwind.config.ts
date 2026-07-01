import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#05060f",
          900: "#0a0b1e",
          800: "#10122b",
          700: "#181a3a",
          600: "#23264d",
        },
        dusk: {
          400: "#7c6ff5",
          500: "#6457e8",
          600: "#4f44c7",
        },
        glow: {
          lavender: "#b9a7ff",
          rose: "#ffb3c8",
          mint: "#a7f0d1",
          sky: "#a7d4ff",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        "breathe-slow": "breathe 9s ease-in-out infinite",
        "spin-slow": "spin 24s linear infinite",
        "spin-reverse": "spin 18s linear infinite reverse",
        "spin-fast": "spin 9s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        ripple: "ripple 3.4s ease-out infinite",
        sway: "sway 7s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "18%": { opacity: "0.45" },
          "100%": { transform: "scale(1.7)", opacity: "0" },
        },
        sway: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(3px, -4px)" },
          "50%": { transform: "translate(0, -6px)" },
          "75%": { transform: "translate(-3px, -4px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

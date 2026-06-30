import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soothr — White Noise",
    short_name: "Soothr",
    description:
      "Calm white-noise companion for newborns. Pink, brown & white noise, fan, rain, ocean, heartbeat, and womb sounds.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060f",
    theme_color: "#05060f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["lifestyle", "health", "kids"],
  };
}

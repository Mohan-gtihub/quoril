import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quoril — Plan. Focus. Understand.",
    short_name: "Quoril",
    description:
      "Plan your day, protect your focus and understand your time in one offline-first desktop app.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBFBFA",
    theme_color: "#16160F",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

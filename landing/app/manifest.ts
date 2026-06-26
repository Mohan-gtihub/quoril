import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quoril — The productivity OS for deep work",
    short_name: "Quoril",
    description:
      "Tasks, focus tracking, analytics and digital wellbeing in one offline-first native desktop app.",
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

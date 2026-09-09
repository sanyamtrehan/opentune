import type { MetadataRoute } from "next";

/**
 * Installability is the point of this project, not a nicety: the app gets used
 * on a phone in a rehearsal room with bad wifi, and add-to-home-screen plus
 * offline is what makes it a tool rather than a demo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenTune — guitar tuner",
    short_name: "OpenTune",
    description:
      "A free guitar tuner with every alternate tuning unlocked. Works offline.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a09",
    theme_color: "#0c0a09",
    categories: ["music", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The artwork is full-bleed, so the same files survive being masked.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

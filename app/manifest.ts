import type { MetadataRoute } from "next";

// Manifests cannot use CSS variables: these are the Midnight page and brand colours
// (docs/design/DESIGN-SYSTEM.md section 2). Public on purpose (proxy.ts skips paths with a dot).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Manar",
    short_name: "Manar",
    description: "Approve what your AI tools ask to do, from your phone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#02070A",
    theme_color: "#02070A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

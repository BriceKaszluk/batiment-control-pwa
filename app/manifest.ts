import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7fafa",
    description: "Controle qualite mobile-first pour batiments.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        purpose: "any",
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        purpose: "maskable",
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        purpose: "maskable",
        src: "/icons/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    id: "/",
    name: "Batiment Control",
    orientation: "portrait",
    scope: "/",
    short_name: "Batiment",
    start_url: "/dashboard",
    theme_color: "#12715d",
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7fafa",
    description: "Controle qualite mobile-first pour batiments.",
    display: "standalone",
    icons: [
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
    name: "Batiment Control",
    orientation: "portrait",
    scope: "/",
    short_name: "Batiment",
    start_url: "/dashboard",
    theme_color: "#12715d",
  };
}

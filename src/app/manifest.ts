import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dar Ezzin — Électroménager au Maroc",
    short_name: "Dar Ezzin",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#1f4a5c",
    lang: "fr-MA",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

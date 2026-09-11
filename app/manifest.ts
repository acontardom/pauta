import type { MetadataRoute } from "next";
import { COLOR_FONDO } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pauta",
    short_name: "Pauta",
    lang: "es-CL",
    start_url: "/hoy",
    display: "standalone",
    background_color: COLOR_FONDO,
    theme_color: COLOR_FONDO,
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}

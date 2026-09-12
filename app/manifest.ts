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
    /*
      Archivos estáticos derivados de public/logo.png, no generados en
      tiempo de ejecución: iOS los pide al instalar la app y no conviene que
      dependan de una función.

      /icon.png viene de app/icon.png (convención de Next), que además emite
      el <link rel="icon">. El de 512 vive en public/ porque el manifest
      necesita una URL estable.
    */
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

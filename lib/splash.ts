/*
  Pantallas de arranque de iOS (apple-touch-startup-image).

  iOS no escala la imagen: usa la que calza EXACTO con el ancho y alto del
  dispositivo en puntos CSS y su densidad, en vertical. Si ninguna calza, la
  app abre en blanco. Por eso hay una entrada por cada tamaño de pantalla.

  Esta lista la usan dos lugares y tienen que coincidir siempre:
  - scripts/iconos.ts genera un PNG por entrada en public/splash/;
  - app/layout.tsx emite un <link> por entrada, con su media query.
*/

export type PantallaIphone = {
  /** Ancho en puntos CSS, en vertical. */
  ancho: number;
  /** Alto en puntos CSS, en vertical. */
  alto: number;
  densidad: 2 | 3;
  /** Solo documentación: qué modelos tienen esta pantalla. */
  modelos: string;
};

export const PANTALLAS_IPHONE: readonly PantallaIphone[] = [
  { ancho: 375, alto: 667, densidad: 2, modelos: "SE 2.ª y 3.ª gen, 8" },
  { ancho: 414, alto: 736, densidad: 3, modelos: "8 Plus" },
  { ancho: 375, alto: 812, densidad: 3, modelos: "X, XS, 11 Pro" },
  /*
    12 mini y 13 mini: hay fuentes que les dan 360×780 y otras que dicen que
    Safari los reporta como 375×812 (renderizan a 1125×2436 y reducen). Con
    esta entrada y la anterior quedan cubiertos en cualquiera de los dos casos.
  */
  { ancho: 360, alto: 780, densidad: 3, modelos: "12 mini, 13 mini" },
  { ancho: 414, alto: 896, densidad: 2, modelos: "XR, 11" },
  { ancho: 414, alto: 896, densidad: 3, modelos: "XS Max, 11 Pro Max" },
  { ancho: 390, alto: 844, densidad: 3, modelos: "12, 12 Pro, 13, 13 Pro, 14, 16e, 17e" },
  { ancho: 428, alto: 926, densidad: 3, modelos: "12 Pro Max, 13 Pro Max, 14 Plus" },
  { ancho: 393, alto: 852, densidad: 3, modelos: "14 Pro, 15, 15 Pro, 16" },
  { ancho: 430, alto: 932, densidad: 3, modelos: "14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus" },
  { ancho: 402, alto: 874, densidad: 3, modelos: "16 Pro, 17, 17 Pro" },
  { ancho: 420, alto: 912, densidad: 3, modelos: "Air" },
  { ancho: 440, alto: 956, densidad: 3, modelos: "16 Pro Max, 17 Pro Max" },
];

/** Ancho del logo en la pantalla de arranque, en puntos: el mismo en todos los iPhone. */
export const ANCHO_LOGO_SPLASH = 160;

/** Tamaño de la imagen en píxeles físicos. */
export function pixelesSplash(p: PantallaIphone): { ancho: number; alto: number } {
  return { ancho: p.ancho * p.densidad, alto: p.alto * p.densidad };
}

/** URL pública de la imagen, p. ej. "/splash/1170x2532.png". */
export function urlSplash(p: PantallaIphone): string {
  const { ancho, alto } = pixelesSplash(p);
  return `/splash/${ancho}x${alto}.png`;
}

export function mediaSplash(p: PantallaIphone): string {
  return (
    `(device-width: ${p.ancho}px) and (device-height: ${p.alto}px) and ` +
    `(-webkit-device-pixel-ratio: ${p.densidad}) and (orientation: portrait)`
  );
}

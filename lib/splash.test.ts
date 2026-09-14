import { describe, expect, it } from "vitest";
import {
  PANTALLAS_IPHONE,
  mediaSplash,
  pixelesSplash,
  urlSplash,
} from "./splash";

describe("pantallas de arranque", () => {
  it("cada pantalla tiene su propio archivo", () => {
    const urls = PANTALLAS_IPHONE.map(urlSplash);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("cada pantalla tiene su propia media query", () => {
    const medias = PANTALLAS_IPHONE.map(mediaSplash);
    expect(new Set(medias).size).toBe(medias.length);
  });

  it("el archivo lleva los píxeles físicos", () => {
    const p = { ancho: 390, alto: 844, densidad: 3, modelos: "" } as const;
    expect(pixelesSplash(p)).toEqual({ ancho: 1170, alto: 2532 });
    expect(urlSplash(p)).toBe("/splash/1170x2532.png");
  });

  it("la media query fija dimensiones, densidad y orientación vertical", () => {
    const p = { ancho: 375, alto: 667, densidad: 2, modelos: "" } as const;
    expect(mediaSplash(p)).toBe(
      "(device-width: 375px) and (device-height: 667px) and " +
        "(-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
    );
  });
});

import { describe, expect, it } from "vitest";
import { entrenamientoCorto, esSesion, etiquetaSesion } from "./dominio";

describe("sesiones de rutina", () => {
  it("la etiqueta guardada es Sesión más la clave", () => {
    expect(etiquetaSesion("A")).toBe("Sesión A");
    expect(esSesion("Sesión B")).toBe(true);
  });

  it("nada más es una sesión", () => {
    expect(esSesion("Sesión ")).toBe(false);
    expect(esSesion("Bicicleta")).toBe(false);
    expect(esSesion("Tren superior")).toBe(false);
  });
});

describe("entrenamientoCorto", () => {
  it("las sesiones van con su clave, en tono de sesión", () => {
    expect(entrenamientoCorto("Sesión A")).toEqual({ corta: "A", tono: "sesion" });
    expect(entrenamientoCorto("Sesión B")).toEqual({ corta: "B", tono: "sesion" });
  });

  it("las opciones fijas tienen su etiqueta corta", () => {
    expect(entrenamientoCorto("Bicicleta")).toEqual({ corta: "Bici", tono: "neutro" });
    expect(entrenamientoCorto("Kinesiología")).toEqual({ corta: "Kine", tono: "neutro" });
    expect(entrenamientoCorto("Descanso")).toEqual({ corta: "Desc", tono: "descanso" });
  });

  it("un valor antiguo va con sus dos primeras letras, en tono neutro", () => {
    expect(entrenamientoCorto("Tren superior")).toEqual({ corta: "Tr", tono: "neutro" });
    expect(entrenamientoCorto("Core")).toEqual({ corta: "Co", tono: "neutro" });
  });
});

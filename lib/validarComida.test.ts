import { describe, expect, it } from "vitest";
import { MAXIMO_TEXTO, validarComida } from "./validarComida";

// Se fija el "ahora" para que las pruebas no dependan del día en que corren.
// 2026-09-11 22:30 en Chile.
const AHORA = new Date("2026-09-12T01:30:00Z");
const HOY = "2026-09-11";

function validar(extra: Record<string, unknown> = {}) {
  return validarComida(
    { fecha: HOY, tiempo: "almuerzo", ...extra },
    AHORA,
  );
}

describe("validarComida", () => {
  it("acepta una comida mínima", () => {
    expect(validar()).toEqual({ ok: true });
  });

  it("acepta porciones, kcal y texto válidos", () => {
    expect(
      validar({
        porciones: { cereales: 1, aceite: 0.5, grasas: 1.5 },
        kcal: 600,
        texto: "Almuerzo en el trabajo",
      }),
    ).toEqual({ ok: true });
  });

  describe("fecha", () => {
    it("rechaza un formato que no es YYYY-MM-DD", () => {
      expect(validar({ fecha: "11-09-2026" }).ok).toBe(false);
      expect(validar({ fecha: "abc" }).ok).toBe(false);
    });

    it("rechaza un día que no existe", () => {
      expect(validar({ fecha: "2026-02-30" }).ok).toBe(false);
    });

    it("rechaza el futuro pero acepta hoy y el pasado", () => {
      expect(validar({ fecha: "2026-09-12" }).ok).toBe(false);
      expect(validar({ fecha: "2099-01-01" }).ok).toBe(false);
      expect(validar({ fecha: HOY }).ok).toBe(true);
      expect(validar({ fecha: "2026-09-04" }).ok).toBe(true);
    });
  });

  describe("tiempo", () => {
    it("acepta los cinco tiempos", () => {
      for (const t of [
        "desayuno",
        "colacion_am",
        "almuerzo",
        "colacion_pm",
        "cena",
      ]) {
        expect(validar({ tiempo: t }).ok).toBe(true);
      }
    });

    it("rechaza cualquier otro", () => {
      expect(validar({ tiempo: "once" }).ok).toBe(false);
      expect(validar({ tiempo: "" }).ok).toBe(false);
    });
  });

  describe("porciones", () => {
    it("rechaza un grupo que no existe", () => {
      const r = validar({ porciones: { proteina: 2 } });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("proteina");
    });

    it("rechaza valores negativos", () => {
      expect(validar({ porciones: { cereales: -1 } }).ok).toBe(false);
    });

    it("rechaza medios en grupos de paso 1", () => {
      expect(validar({ porciones: { proteicos: 1.5 } }).ok).toBe(false);
    });

    it("acepta medios en aceite y grasas, pero no tercios", () => {
      expect(validar({ porciones: { aceite: 0.5 } }).ok).toBe(true);
      expect(validar({ porciones: { grasas: 1.5 } }).ok).toBe(true);
      expect(validar({ porciones: { aceite: 0.3 } }).ok).toBe(false);
    });

    it("acepta un objeto vacío y null", () => {
      expect(validar({ porciones: {} }).ok).toBe(true);
      expect(validar({ porciones: null }).ok).toBe(true);
    });
  });

  describe("kcal", () => {
    it("acepta entero >= 0 y null", () => {
      expect(validar({ kcal: 0 }).ok).toBe(true);
      expect(validar({ kcal: 600 }).ok).toBe(true);
      expect(validar({ kcal: null }).ok).toBe(true);
    });

    it("rechaza negativas y decimales", () => {
      expect(validar({ kcal: -1 }).ok).toBe(false);
      expect(validar({ kcal: 12.5 }).ok).toBe(false);
    });
  });

  describe("texto", () => {
    it("acepta hasta el máximo", () => {
      expect(validar({ texto: "a".repeat(MAXIMO_TEXTO) }).ok).toBe(true);
    });

    it("rechaza pasarse del máximo", () => {
      expect(validar({ texto: "a".repeat(MAXIMO_TEXTO + 1) }).ok).toBe(false);
    });

    it("acepta vacío y null", () => {
      expect(validar({ texto: "" }).ok).toBe(true);
      expect(validar({ texto: null }).ok).toBe(true);
    });
  });
});

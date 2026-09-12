import { describe, expect, it } from "vitest";
import { validarMedida, type EntradaMedida } from "./validarMedida";

// 2026-09-11 22:30 en Chile.
const AHORA = new Date("2026-09-12T01:30:00Z");
const HOY = "2026-09-11";

function validar(extra: Partial<EntradaMedida> = {}) {
  return validarMedida(
    { fecha: HOY, peso: "82,9", cintura: "95,2", ...extra },
    AHORA,
  );
}

describe("validarMedida", () => {
  it("acepta y normaliza peso y cintura", () => {
    const r = validar();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.medida).toEqual({ fecha: HOY, peso: 82.9, cintura: 95.2 });
    }
  });

  it("acepta coma y punto como separador decimal", () => {
    const conComa = validar({ peso: "82,9" });
    const conPunto = validar({ peso: "82.9" });
    expect(conComa.ok && conComa.medida.peso).toBe(82.9);
    expect(conPunto.ok && conPunto.medida.peso).toBe(82.9);
  });

  describe("fecha", () => {
    it("rechaza formatos y días inexistentes", () => {
      expect(validar({ fecha: "11-09-2026" }).ok).toBe(false);
      expect(validar({ fecha: "abc" }).ok).toBe(false);
      expect(validar({ fecha: "2026-02-30" }).ok).toBe(false);
    });

    it("rechaza el futuro y acepta hoy y el pasado", () => {
      expect(validar({ fecha: "2026-09-12" }).ok).toBe(false);
      expect(validar({ fecha: "2099-01-01" }).ok).toBe(false);
      expect(validar({ fecha: HOY }).ok).toBe(true);
      expect(validar({ fecha: "2026-09-01" }).ok).toBe(true);
    });
  });

  describe("se puede guardar solo uno de los dos", () => {
    it("solo peso deja la cintura en null", () => {
      const r = validar({ cintura: "" });
      expect(r.ok && r.medida).toEqual({ fecha: HOY, peso: 82.9, cintura: null });
    });

    it("solo cintura deja el peso en null", () => {
      const r = validar({ peso: "" });
      expect(r.ok && r.medida).toEqual({ fecha: HOY, peso: null, cintura: 95.2 });
    });

    it("los dos vacíos se rechazan", () => {
      const r = validar({ peso: "", cintura: "" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("al menos");
    });

    it("espacios en blanco cuentan como vacío", () => {
      expect(validar({ peso: "   ", cintura: "   " }).ok).toBe(false);
      const r = validar({ cintura: "  " });
      expect(r.ok && r.medida.cintura).toBe(null);
    });
  });

  describe("valores", () => {
    it("rechaza cero y negativos", () => {
      expect(validar({ peso: "0" }).ok).toBe(false);
      expect(validar({ peso: "-5" }).ok).toBe(false);
      expect(validar({ cintura: "0" }).ok).toBe(false);
    });

    it("rechaza texto que no es número", () => {
      const r = validar({ peso: "mucho" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("peso");
    });

    it("acepta decimales", () => {
      const r = validar({ peso: "83,45", cintura: "95" });
      expect(r.ok && r.medida.peso).toBe(83.45);
      expect(r.ok && r.medida.cintura).toBe(95);
    });
  });
});

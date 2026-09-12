import { describe, expect, it } from "vitest";
import { validarInbody, type EntradaInbody } from "./validarInbody";

// 2026-09-11 22:30 en Chile.
const AHORA = new Date("2026-09-12T01:30:00Z");
const HOY = "2026-09-11";

const COMPLETA: EntradaInbody["valores"] = {
  peso: "82,5",
  masa_grasa: "15,8",
  pct_grasa: "19,2",
  masa_musculoesqueletica: "38,8",
  masa_libre_grasa: "66,7",
  agua_total: "48,9",
};

function validar(
  valores: EntradaInbody["valores"] = COMPLETA,
  fecha: string = HOY,
) {
  return validarInbody({ fecha, valores }, AHORA);
}

describe("validarInbody", () => {
  it("acepta y normaliza una medición completa", () => {
    const r = validar();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.medicion).toEqual({
        fecha: HOY,
        peso: 82.5,
        masa_grasa: 15.8,
        pct_grasa: 19.2,
        masa_musculoesqueletica: 38.8,
        masa_libre_grasa: 66.7,
        agua_total: 48.9,
      });
    }
  });

  it("acepta coma y punto", () => {
    const r = validar({ peso: "82.5", masa_grasa: "15,8" });
    expect(r.ok && r.medicion.peso).toBe(82.5);
    expect(r.ok && r.medicion.masa_grasa).toBe(15.8);
  });

  describe("fecha", () => {
    it("rechaza inválidas y futuras", () => {
      expect(validar(COMPLETA, "abc").ok).toBe(false);
      expect(validar(COMPLETA, "2026-02-30").ok).toBe(false);
      expect(validar(COMPLETA, "2026-09-12").ok).toBe(false);
    });

    it("acepta hoy y el pasado", () => {
      expect(validar(COMPLETA, HOY).ok).toBe(true);
      expect(validar(COMPLETA, "2026-09-01").ok).toBe(true);
    });
  });

  describe("campos vacíos", () => {
    it("un campo vacío se guarda como null", () => {
      const r = validar({ ...COMPLETA, agua_total: "" });
      expect(r.ok && r.medicion.agua_total).toBe(null);
      expect(r.ok && r.medicion.peso).toBe(82.5);
    });

    it("un campo ausente también es null", () => {
      const r = validar({ pct_grasa: "19,2" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.medicion.pct_grasa).toBe(19.2);
        expect(r.medicion.peso).toBe(null);
        expect(r.medicion.masa_musculoesqueletica).toBe(null);
      }
    });

    it("los seis vacíos se rechazan", () => {
      const r = validar({
        peso: "",
        masa_grasa: " ",
        pct_grasa: "",
        masa_musculoesqueletica: "",
        masa_libre_grasa: "",
        agua_total: "",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("al menos");
      expect(validar({}).ok).toBe(false);
    });
  });

  describe("valores", () => {
    it("rechaza cero, negativos y texto", () => {
      expect(validar({ peso: "0" }).ok).toBe(false);
      expect(validar({ masa_grasa: "-2" }).ok).toBe(false);
      const r = validar({ agua_total: "mucha" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("Agua corporal total");
    });

    it("rechaza un % de grasa sobre 100", () => {
      const r = validar({ pct_grasa: "150" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("entre 0 y 100");
    });

    it("acepta un % de grasa de 100 justo", () => {
      expect(validar({ pct_grasa: "100" }).ok).toBe(true);
    });

    it("los otros campos no tienen tope de 100", () => {
      expect(validar({ peso: "150" }).ok).toBe(true);
    });
  });
});

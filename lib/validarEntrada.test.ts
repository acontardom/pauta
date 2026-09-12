import { describe, expect, it } from "vitest";
import { validarEntrada, type EntradaFormulario } from "./validarEntrada";

// 2026-09-11 22:30 en Chile.
const AHORA = new Date("2026-09-12T01:30:00Z");
const HOY = "2026-09-11";

function validar(datos: Partial<EntradaFormulario> & Pick<EntradaFormulario, "tipo">) {
  return validarEntrada({ fecha: HOY, ...datos }, AHORA);
}

describe("validarEntrada", () => {
  describe("kinesiología", () => {
    it("acepta una sesión completa y deja en null lo que no corresponde", () => {
      const r = validar({
        tipo: "kine",
        numero_sesion: 4,
        autorizado: ["Propiocepción", " Subir escaleras "],
        hinchazon: "menos",
        nota: "  Bien  ",
      });
      expect(r).toEqual({
        ok: true,
        entrada: {
          fecha: HOY,
          tipo: "kine",
          numero_sesion: 4,
          autorizado: ["Propiocepción", "Subir escaleras"],
          hinchazon: "menos",
          indicaciones: null,
          proximo_control: null,
          nota: "Bien",
        },
      });
    });

    it("el número de sesión puede quedar vacío", () => {
      const r = validar({ tipo: "kine" });
      expect(r.ok && r.entrada.numero_sesion).toBe(null);
    });

    it("rechaza un número de sesión que no sea entero positivo", () => {
      expect(validar({ tipo: "kine", numero_sesion: 0 }).ok).toBe(false);
      expect(validar({ tipo: "kine", numero_sesion: -1 }).ok).toBe(false);
      expect(validar({ tipo: "kine", numero_sesion: 1.5 }).ok).toBe(false);
    });

    it("rechaza una hinchazón inválida", () => {
      expect(validar({ tipo: "kine", hinchazon: "mucha" }).ok).toBe(false);
    });

    it("no acepta indicaciones ni próximo control", () => {
      expect(validar({ tipo: "kine", indicaciones: "Carga parcial" }).ok).toBe(false);
      expect(validar({ tipo: "kine", proximo_control: "2026-10-21" }).ok).toBe(false);
    });

    it("indicaciones vacías no cuentan como indicaciones", () => {
      expect(validar({ tipo: "kine", indicaciones: "   ", proximo_control: "" }).ok).toBe(true);
    });
  });

  describe("control médico", () => {
    it("acepta indicaciones y un próximo control futuro", () => {
      const r = validar({ tipo: "control", indicaciones: "Carga parcial", proximo_control: "2026-10-21" });
      expect(r.ok && r.entrada).toEqual({
        fecha: HOY,
        tipo: "control",
        numero_sesion: null,
        autorizado: [],
        hinchazon: null,
        indicaciones: "Carga parcial",
        proximo_control: "2026-10-21",
        nota: null,
      });
    });

    it("rechaza un próximo control con fecha inválida", () => {
      expect(validar({ tipo: "control", proximo_control: "2026-02-30" }).ok).toBe(false);
    });

    it("no acepta número de sesión, hinchazón ni autorizaciones", () => {
      expect(validar({ tipo: "control", numero_sesion: 2 }).ok).toBe(false);
      expect(validar({ tipo: "control", hinchazon: "igual" }).ok).toBe(false);
      expect(validar({ tipo: "control", autorizado: ["Trote"] }).ok).toBe(false);
    });
  });

  describe("nota", () => {
    it("acepta solo la nota", () => {
      const r = validar({ tipo: "nota", nota: "Dolor leve al subir escaleras" });
      expect(r.ok && r.entrada.nota).toBe("Dolor leve al subir escaleras");
    });

    it("no acepta campos de control", () => {
      expect(validar({ tipo: "nota", proximo_control: "2026-10-21" }).ok).toBe(false);
      expect(validar({ tipo: "nota", indicaciones: "algo" }).ok).toBe(false);
    });
  });

  describe("comunes", () => {
    it("rechaza un tipo desconocido", () => {
      expect(validar({ tipo: "doc" }).ok).toBe(false);
    });

    it("rechaza fechas inválidas y futuras", () => {
      expect(validarEntrada({ fecha: "abc", tipo: "nota" }, AHORA).ok).toBe(false);
      expect(validarEntrada({ fecha: "2026-09-12", tipo: "nota" }, AHORA).ok).toBe(false);
      expect(validarEntrada({ fecha: "2026-09-01", tipo: "nota" }, AHORA).ok).toBe(true);
    });

    it("lo autorizado no admite vacíos ni repetidos", () => {
      expect(validar({ tipo: "kine", autorizado: ["Trote", "  "] }).ok).toBe(false);
      const r = validar({ tipo: "kine", autorizado: ["Trote", " Trote "] });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("repetido");
    });
  });
});

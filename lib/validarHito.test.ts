import { describe, expect, it } from "vitest";
import { MAXIMO_NOMBRE_HITO, validarHito, type HitoFormulario } from "./validarHito";

// 2026-09-12 12:00 en Chile.
const AHORA = new Date("2026-09-12T15:00:00Z");

function datos(extra: Partial<HitoFormulario> = {}): HitoFormulario {
  return {
    nombre: "Inicio de carga completa",
    fecha_planificada: "2026-10-16",
    fecha_real: null,
    cumplido: false,
    ...extra,
  };
}

describe("validarHito", () => {
  describe("nombre", () => {
    it("le hace trim y rechaza vacío", () => {
      const r = validarHito(datos({ nombre: "  Trote suave  " }), null, AHORA);
      expect(r.ok && r.hito.nombre).toBe("Trote suave");
      expect(validarHito(datos({ nombre: "   " }), null, AHORA).ok).toBe(false);
    });

    it("acepta 80 caracteres y rechaza 81", () => {
      expect(validarHito(datos({ nombre: "a".repeat(MAXIMO_NOMBRE_HITO) }), null, AHORA).ok).toBe(true);
      expect(validarHito(datos({ nombre: "a".repeat(MAXIMO_NOMBRE_HITO + 1) }), null, AHORA).ok).toBe(false);
    });
  });

  describe("fechas", () => {
    it("un hito se puede guardar sin fecha planificada", () => {
      const r = validarHito(datos({ nombre: "Vuelta a la marcha sin muletas", fecha_planificada: null }), null, AHORA);
      expect(r.ok && r.hito.fecha_planificada).toBe(null);
      // Vacío también es null.
      const r2 = validarHito(datos({ fecha_planificada: "" }), null, AHORA);
      expect(r2.ok && r2.hito.fecha_planificada).toBe(null);
    });

    it("la fecha planificada puede ser futura", () => {
      const r = validarHito(datos({ fecha_planificada: "2027-03-01" }), null, AHORA);
      expect(r.ok).toBe(true);
    });

    it("la fecha real no puede ser futura, pero sí hoy o antes", () => {
      expect(validarHito(datos({ fecha_real: "2026-09-13", cumplido: true }), null, AHORA)).toEqual({
        ok: false,
        error: "La fecha real no puede ser posterior a hoy",
      });
      expect(validarHito(datos({ fecha_real: "2026-09-12", cumplido: true }), null, AHORA).ok).toBe(true);
      expect(validarHito(datos({ fecha_real: "2026-09-01", cumplido: true }), null, AHORA).ok).toBe(true);
    });

    it("rechaza fechas inválidas", () => {
      expect(validarHito(datos({ fecha_planificada: "2026-02-30" }), null, AHORA).ok).toBe(false);
      expect(validarHito(datos({ fecha_real: "abc", cumplido: true }), null, AHORA).ok).toBe(false);
    });
  });

  describe("cumplido y fecha real", () => {
    it("tienen que coincidir, como exige el esquema", () => {
      expect(validarHito(datos({ cumplido: true, fecha_real: null }), null, AHORA).ok).toBe(false);
      expect(validarHito(datos({ cumplido: false, fecha_real: "2026-09-10" }), null, AHORA).ok).toBe(false);
      expect(validarHito(datos({ cumplido: true, fecha_real: "2026-09-10" }), null, AHORA).ok).toBe(true);
    });
  });

  describe("historial", () => {
    it("un hito nuevo parte con el historial vacío", () => {
      const r = validarHito(datos(), null, AHORA);
      expect(r.ok && r.hito.historial).toEqual([]);
    });

    it("cambiar la fecha planificada agrega una entrada", () => {
      const r = validarHito(
        datos({ fecha_planificada: "2026-10-23", motivo: " Control lo movió " }),
        { fecha_planificada: "2026-10-16", historial: [] },
        AHORA,
      );
      expect(r.ok && r.hito.historial).toEqual([
        { desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" },
      ]);
    });

    it("un segundo cambio conserva el primero", () => {
      const primero = { desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" };
      const r = validarHito(
        datos({ fecha_planificada: "2026-10-30", motivo: "Otra vez" }),
        { fecha_planificada: "2026-10-23", historial: [primero] },
        AHORA,
      );
      expect(r.ok && r.hito.historial).toEqual([
        primero,
        { desde: "2026-10-23", hasta: "2026-10-30", motivo: "Otra vez", fecha_cambio: "2026-09-12" },
      ]);
    });

    it("sin motivo, la entrada se crea igual", () => {
      const r = validarHito(datos({ fecha_planificada: "2026-10-23", motivo: "   " }), { fecha_planificada: "2026-10-16", historial: [] }, AHORA);
      expect(r.ok && r.hito.historial).toEqual([
        { desde: "2026-10-16", hasta: "2026-10-23", motivo: null, fecha_cambio: "2026-09-12" },
      ]);
    });

    it("dejar la misma fecha no agrega nada", () => {
      const r = validarHito(datos({ nombre: "Otro nombre" }), { fecha_planificada: "2026-10-16", historial: [] }, AHORA);
      expect(r.ok && r.hito.historial).toEqual([]);
    });

    it("ponerle fecha a un hito que no tenía no es un cambio", () => {
      const r = validarHito(datos({ fecha_planificada: "2026-11-01" }), { fecha_planificada: null, historial: [] }, AHORA);
      expect(r.ok && r.hito.historial).toEqual([]);
    });

    it("quitarle la fecha sí es un cambio, hacia 'sin fecha'", () => {
      const r = validarHito(datos({ fecha_planificada: null }), { fecha_planificada: "2026-10-16", historial: [] }, AHORA);
      expect(r.ok && r.hito.historial).toEqual([
        { desde: "2026-10-16", hasta: null, motivo: null, fecha_cambio: "2026-09-12" },
      ]);
    });

    it("tolera un historial guardado en null", () => {
      const r = validarHito(datos({ fecha_planificada: "2026-10-23" }), { fecha_planificada: "2026-10-16", historial: null }, AHORA);
      expect(r.ok && r.hito.historial).toHaveLength(1);
    });
  });
});

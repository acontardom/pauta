import { describe, expect, it } from "vitest";
import {
  AVISO_FALLO,
  AVISO_SIN_CONEXION,
  esFalloDeRed,
  llamarAccion,
} from "./red";

describe("esFalloDeRed", () => {
  it("sin conexión siempre es fallo de red", () => {
    expect(esFalloDeRed(new Error("cualquiera"), false)).toBe(true);
  });

  it("un TypeError de fetch es fallo de red aunque diga que hay conexión", () => {
    expect(esFalloDeRed(new TypeError("Load failed"), true)).toBe(true);
  });

  it("otro error con conexión no es de red", () => {
    expect(esFalloDeRed(new Error("respuesta inesperada"), true)).toBe(false);
  });
});

describe("llamarAccion", () => {
  it("devuelve la respuesta de la acción tal cual", async () => {
    await expect(llamarAccion(async () => ({ ok: true }))).resolves.toEqual({
      ok: true,
    });
    await expect(
      llamarAccion(async () => ({ ok: false, error: "Ese menú ya no existe" })),
    ).resolves.toEqual({ ok: false, error: "Ese menú ya no existe" });
  });

  it("convierte un rechazo de red en el aviso de sin conexión", async () => {
    const r = await llamarAccion(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(r).toEqual({ ok: false, error: AVISO_SIN_CONEXION });
  });

  it("convierte cualquier otro rechazo en el aviso genérico", async () => {
    const r = await llamarAccion(async () => {
      throw new Error("An unexpected response was received from the server.");
    });
    expect(r).toEqual({ ok: false, error: AVISO_FALLO });
  });
});

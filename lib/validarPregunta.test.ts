import { describe, expect, it } from "vitest";
import { MAXIMO_PREGUNTA, validarPregunta } from "./validarPregunta";

describe("validarPregunta", () => {
  it("acepta y le hace trim", () => {
    expect(validarPregunta("  ¿Puedo empezar bicicleta de pie?  ")).toEqual({
      ok: true,
      texto: "¿Puedo empezar bicicleta de pie?",
    });
  });

  it("rechaza vacía y solo espacios", () => {
    expect(validarPregunta("").ok).toBe(false);
    expect(validarPregunta("    ").ok).toBe(false);
  });

  it("acepta 200 caracteres y rechaza 201", () => {
    expect(validarPregunta("a".repeat(MAXIMO_PREGUNTA)).ok).toBe(true);
    expect(validarPregunta("a".repeat(MAXIMO_PREGUNTA + 1)).ok).toBe(false);
  });

  it("el máximo se mide después del trim", () => {
    expect(validarPregunta(`  ${"a".repeat(MAXIMO_PREGUNTA)}  `).ok).toBe(true);
  });

  it("rechaza lo que no es texto", () => {
    expect(validarPregunta(null).ok).toBe(false);
    expect(validarPregunta(42).ok).toBe(false);
  });
});

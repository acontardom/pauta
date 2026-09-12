import { describe, expect, it } from "vitest";
import { estadoComida, totalesDia } from "./dia";
import type { Comida, ModoComida, Porciones } from "./supabase/tipos";

/** Comida mínima: solo lo que leen totalesDia y estadoComida. */
function comida(
  modo: ModoComida,
  porciones: Porciones,
  kcal: number | null = null,
): Comida {
  return {
    id: "x",
    user_id: "u",
    created_at: "",
    updated_at: "",
    fecha: "2026-09-11",
    tiempo: "almuerzo",
    modo,
    menu_id: null,
    nombre_menu: null,
    texto_libre: null,
    porciones,
    kcal,
  };
}

describe("totalesDia", () => {
  it("suma por grupo e incluye las comidas estimadas", () => {
    const t = totalesDia([
      comida("menu", { cereales: 1, proteicos: 4 }, 600),
      comida("fuera", { cereales: 1, verduras: 2 }, 400),
    ]);
    expect(t.porciones).toEqual({ cereales: 2, verduras: 2, proteicos: 4 });
    expect(t.kcal).toBe(1000);
    expect(t.comidasConKcal).toBe(2);
  });

  it("ignora las kcal en null pero suma sus porciones", () => {
    const t = totalesDia([
      comida("manual", { cereales: 1 }, null),
      comida("menu", { cereales: 1 }, 300),
    ]);
    expect(t.porciones).toEqual({ cereales: 2 });
    expect(t.kcal).toBe(300);
    expect(t.comidasConKcal).toBe(1);
  });

  it("suma medias porciones sin error de punto flotante", () => {
    const t = totalesDia([
      comida("manual", { aceite: 0.5, grasas: 0.5 }),
      comida("manual", { aceite: 0.5, grasas: 1 }),
    ]);
    expect(t.porciones).toEqual({ aceite: 1, grasas: 1.5 });
  });

  it("sin comidas, todo en cero y ninguna con kcal", () => {
    const t = totalesDia([]);
    expect(t.porciones).toEqual({});
    expect(t.kcal).toBe(0);
    expect(t.comidasConKcal).toBe(0);
  });
});

describe("estadoComida", () => {
  it("sin fila es pendiente", () => {
    expect(estadoComida(undefined)).toBe("pendiente");
    expect(estadoComida(null)).toBe("pendiente");
  });

  it("modo fuera es estimada", () => {
    expect(estadoComida(comida("fuera", {}))).toBe("estimada");
  });

  it("modo menu y manual son completas", () => {
    expect(estadoComida(comida("menu", { cereales: 1 }))).toBe("completa");
    expect(estadoComida(comida("manual", { cereales: 1 }))).toBe("completa");
  });
});

import { describe, expect, it } from "vitest";
import {
  estadoComida,
  resumenDia,
  textoAgua,
  textoLitros,
  totalesDia,
} from "./dia";
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

describe("textoAgua", () => {
  it("muestra litros con dos decimales y coma", () => {
    expect(textoAgua(1250)).toBe("1,25 L");
    expect(textoAgua(0)).toBe("0,00 L");
    expect(textoAgua(2000)).toBe("2,00 L");
    expect(textoAgua(2250)).toBe("2,25 L");
  });
});

describe("resumenDia", () => {
  const dia = {
    agua_ml: 1250,
    entrenamiento: ["Sesión A", "Kinesiología"],
    estado_tobillo: "mejor" as const,
  };

  it("devuelve ocho filas, en orden", () => {
    const filas = resumenDia([], dia);
    expect(filas).toHaveLength(8);
    expect(filas.map((f) => f.etiqueta)).toEqual([
      "Desayuno",
      "Colación AM",
      "Almuerzo",
      "Colación PM",
      "Cena",
      "Agua",
      "Entrenamiento",
      "Tobillo",
    ]);
  });

  it("sin fila de dias, todo queda en sus valores por defecto", () => {
    const filas = resumenDia([], null);
    expect(filas[5]).toEqual({ etiqueta: "Agua", valor: "0,00 L", tono: "azul" });
    expect(filas[6].valor).toBe("Sin registro");
    expect(filas[7].valor).toBe("Sin registro");
  });

  it("con las cinco comidas pendientes, ninguna reprocha nada", () => {
    const filas = resumenDia([], dia).slice(0, 5);
    for (const f of filas) {
      expect(f.valor).toBe("Sin registro");
      expect(f.tono).toBe("neutro");
    }
  });

  it("una comida de menú muestra su nombre en verde", () => {
    const c = { ...comida("menu", { cereales: 1 }), nombre_menu: "Pollo con arroz" };
    const filas = resumenDia([c], dia);
    expect(filas[2]).toEqual({
      etiqueta: "Almuerzo",
      valor: "Pollo con arroz",
      tono: "verde",
    });
  });

  it("una comida manual, sin nombre, dice Completa", () => {
    const filas = resumenDia([comida("manual", { cereales: 1 })], dia);
    expect(filas[2].valor).toBe("Completa");
    expect(filas[2].tono).toBe("verde");
  });

  it("una estimada muestra su texto en azul, y Estimada si no hay texto", () => {
    const conTexto = { ...comida("fuera", {}), texto_libre: "Almuerzo en el trabajo" };
    expect(resumenDia([conTexto], dia)[2]).toEqual({
      etiqueta: "Almuerzo",
      valor: "Almuerzo en el trabajo",
      tono: "azul",
    });
    expect(resumenDia([comida("fuera", {})], dia)[2].valor).toBe("Estimada");
  });

  it("el entrenamiento junta lo guardado, aunque ya no sea una opción", () => {
    expect(resumenDia([], dia)[6].valor).toBe("Sesión A, Kinesiología");
  });

  it("un día antiguo con minutos guardados no los muestra", () => {
    const antiguo = {
      ...dia,
      entrenamiento: ["Tren superior", "Core"],
      entrenamiento_minutos: 45,
    };
    const filas = resumenDia([], antiguo);
    expect(filas[6]).toEqual({
      etiqueta: "Entrenamiento",
      valor: "Tren superior, Core",
      tono: "neutro",
    });
  });

  it("traduce el estado del tobillo", () => {
    expect(resumenDia([], { ...dia, estado_tobillo: "peor" })[7].valor).toBe("Peor");
    expect(resumenDia([], { ...dia, estado_tobillo: null })[7].valor).toBe(
      "Sin registro",
    );
  });

  it("ninguna fila usa un tono de falla", () => {
    for (const f of resumenDia([], null)) {
      expect(["verde", "azul", "neutro"]).toContain(f.tono);
    }
  });
});

describe("textoLitros", () => {
  it("muestra hasta dos decimales, sin ceros de relleno", () => {
    // Los valores exactos del criterio de aceptación de la tarjeta de agua.
    expect(textoLitros(0)).toBe("0");
    expect(textoLitros(250)).toBe("0,25");
    expect(textoLitros(1250)).toBe("1,25");
    expect(textoLitros(2000)).toBe("2");
    expect(textoLitros(2250)).toBe("2,25");
    expect(textoLitros(500)).toBe("0,5");
  });
});

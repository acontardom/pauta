import { describe, expect, it } from "vitest";
import {
  ajustarPorcion,
  limpiarPorciones,
  porcionesIguales,
  porcionesVacias,
  textoPorciones,
} from "./porciones";
import type { Porciones } from "./supabase/tipos";

describe("textoPorciones", () => {
  it("usa el orden de GRUPOS aunque el objeto venga desordenado", () => {
    const p: Porciones = {
      aceite: 0.5,
      proteicos: 4,
      cereales: 1,
      verduras: 2,
    };
    expect(textoPorciones(p)).toBe(
      "1 cereales · 2 verduras · 4 proteicos · 0,5 aceite",
    );
  });

  it("escribe los decimales con coma", () => {
    expect(textoPorciones({ grasas: 1.5 })).toBe("1,5 grasas");
  });

  it("omite los ceros", () => {
    expect(textoPorciones({ cereales: 1, verduras: 0, fruta: 0 })).toBe(
      "1 cereales",
    );
  });

  it("agrega las kcal al final", () => {
    expect(textoPorciones({ cereales: 1 }, 600)).toBe("1 cereales · 600 kcal");
  });

  it("devuelve vacío si no hay nada", () => {
    expect(textoPorciones({})).toBe("");
    expect(textoPorciones(null)).toBe("");
    expect(textoPorciones({ cereales: 0 })).toBe("");
  });

  it("muestra las kcal aunque no haya porciones", () => {
    expect(textoPorciones({}, 300)).toBe("300 kcal");
  });
});

describe("ajustarPorcion", () => {
  it("suma y resta el paso", () => {
    expect(ajustarPorcion(1, 1, 1)).toBe(2);
    expect(ajustarPorcion(2, 1, -1)).toBe(1);
    expect(ajustarPorcion(0.5, 0.5, 1)).toBe(1);
  });

  it("nunca baja de 0", () => {
    expect(ajustarPorcion(0, 1, -1)).toBe(0);
    expect(ajustarPorcion(0, 0.5, -1)).toBe(0);
    expect(ajustarPorcion(0.5, 0.5, -1)).toBe(0);
  });

  it("no arrastra error de punto flotante", () => {
    let v = 0;
    for (let i = 0; i < 6; i++) v = ajustarPorcion(v, 0.5, 1);
    expect(v).toBe(3);
  });
});

describe("limpiarPorciones", () => {
  it("quita los ceros y las claves desconocidas", () => {
    const sucio = {
      cereales: 2,
      verduras: 0,
      inventado: 5,
    } as unknown as Porciones;
    expect(limpiarPorciones(sucio)).toEqual({ cereales: 2 });
  });

  it("tolera null", () => {
    expect(limpiarPorciones(null)).toEqual({});
  });
});

describe("porcionesVacias", () => {
  it("distingue vacío de con contenido", () => {
    expect(porcionesVacias({})).toBe(true);
    expect(porcionesVacias({ cereales: 0, aceite: 0 })).toBe(true);
    expect(porcionesVacias(null)).toBe(true);
    expect(porcionesVacias({ aceite: 0.5 })).toBe(false);
  });
});

describe("porcionesIguales", () => {
  it("un 0 y la ausencia son lo mismo, y el orden de las claves no importa", () => {
    expect(porcionesIguales({ cereales: 1, aceite: 0 }, { cereales: 1 })).toBe(true);
    expect(porcionesIguales({ aceite: 0.5, cereales: 1 }, { cereales: 1, aceite: 0.5 })).toBe(true);
    expect(porcionesIguales(null, {})).toBe(true);
  });

  it("distinto valor o distinto grupo no son iguales", () => {
    expect(porcionesIguales({ cereales: 1 }, { cereales: 2 })).toBe(false);
    expect(porcionesIguales({ cereales: 1 }, { verduras: 1 })).toBe(false);
  });
});

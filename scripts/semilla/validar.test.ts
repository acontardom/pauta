import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validarSemilla } from "./validar";

/*
  Cada caso inválido parte de una semilla mínima válida y rompe UNA cosa.
  Así, si una prueba falla, el error apunta a la regla y no al andamiaje.
*/
function semillaValida() {
  return {
    _nota: "las claves con guion bajo se ignoran",
    configuracion: {
      metas_porciones: { cereales: 3, aceite: 1, grasas: 1.5 },
      meta_agua_ml: 2000,
      meta_pct_grasa: 13,
      meta_peso: 76.5,
      meta_cintura: 88,
      horarios: {
        desayuno: "08:30",
        colacion_am: "11:30",
        almuerzo: "13:30",
        colacion_pm: "17:00",
        cena: "20:00",
      },
      fecha_operacion: "2026-09-04",
      fecha_retorno: null,
    },
    hitos: [
      {
        clave: "operacion",
        nombre: "Operación de tobillo",
        fecha_planificada: "2026-09-04",
        fecha_real: "2026-09-04",
      },
    ],
    menus: [
      {
        tiempo: "desayuno",
        nombre: "Avena con leche",
        ingredientes: ["35 g avena"],
        observacion: null,
        porciones: { cereales: 1, aceite: 0.5 },
        kcal: 600,
      },
    ],
    alimentos: [
      {
        grupo: "cereales",
        nombre: "pan marraqueta",
        medida_casera: "1/2 unidad",
        gramos: 50,
        orden: 1,
      },
    ],
    medidas: [{ fecha: "2026-09-01", peso: 83.4, cintura: 95.7 }],
    inbody: [{ fecha: "2026-09-01", peso: 83.4, pct_grasa: 20 }],
    entradas_recuperacion: [
      {
        fecha: "2026-09-08",
        tipo: "kine",
        numero_sesion: 1,
        autorizado: ["Movilidad activa"],
        hinchazon: "menos",
        indicaciones: null,
        nota: "Mejora",
        proximo_control: null,
      },
    ],
    preguntas_control: [{ texto: "¿Cuántas porciones de aceite?" }],
  };
}

/** Rompe la semilla con `romper` y devuelve las rutas de los errores. */
function rutasDeError(romper: (s: ReturnType<typeof semillaValida>) => void) {
  const s = semillaValida();
  romper(s);
  const r = validarSemilla(s);
  expect(r.ok).toBe(false);
  return r.errores.map((e) => e.ruta);
}

describe("validarSemilla", () => {
  it("acepta un ejemplo mínimo válido", () => {
    const r = validarSemilla(semillaValida());
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("rechaza una clave de grupo inexistente", () => {
    const rutas = rutasDeError((s) => {
      (s.menus[0].porciones as Record<string, number>).proteina = 2;
    });
    expect(rutas).toContain("menus[0].porciones.proteina");
  });

  it("rechaza aceite 0,3: no es múltiplo de 0,5", () => {
    const s = semillaValida();
    s.menus[0].porciones.aceite = 0.3;
    const r = validarSemilla(s);
    expect(r.ok).toBe(false);
    expect(r.errores).toContainEqual({
      ruta: "menus[0].porciones.aceite",
      problema: "debe ser múltiplo de 0,5",
    });
  });

  it("rechaza proteicos 1,5: su paso es 1", () => {
    const rutas = rutasDeError((s) => {
      (s.menus[0].porciones as Record<string, number>).proteicos = 1.5;
    });
    expect(rutas).toContain("menus[0].porciones.proteicos");
  });

  it("rechaza un tiempo de comida inválido", () => {
    const rutas = rutasDeError((s) => {
      (s.menus[0] as { tiempo: string }).tiempo = "once";
    });
    expect(rutas).toContain("menus[0].tiempo");
  });

  it("rechaza una fecha inválida", () => {
    const rutas = rutasDeError((s) => {
      s.medidas[0].fecha = "2026-02-30";
    });
    expect(rutas).toContain("medidas[0].fecha");
  });

  it("rechaza kcal negativa", () => {
    const rutas = rutasDeError((s) => {
      s.menus[0].kcal = -10;
    });
    expect(rutas).toContain("menus[0].kcal");
  });

  it("rechaza una entrada kine con proximo_control", () => {
    const rutas = rutasDeError((s) => {
      (s.entradas_recuperacion[0] as { proximo_control: string | null })
        .proximo_control = "2026-09-23";
    });
    expect(rutas).toContain("entradas_recuperacion[0].proximo_control");
  });

  it("rechaza una hinchazón inválida", () => {
    const rutas = rutasDeError((s) => {
      (s.entradas_recuperacion[0] as { hinchazon: string }).hinchazon = "mucha";
    });
    expect(rutas).toContain("entradas_recuperacion[0].hinchazon");
  });

  it("rechaza un menú duplicado por (tiempo, nombre)", () => {
    const rutas = rutasDeError((s) => {
      s.menus.push({ ...s.menus[0] });
    });
    expect(rutas).toContain("menus[1]");
  });

  it("rechaza un alimento duplicado por (grupo, nombre)", () => {
    const rutas = rutasDeError((s) => {
      s.alimentos.push({ ...s.alimentos[0] });
    });
    expect(rutas).toContain("alimentos[1]");
  });

  it("rechaza grasa_visceral: la columna se eliminó del esquema", () => {
    const rutas = rutasDeError((s) => {
      (s.inbody[0] as Record<string, unknown>).grasa_visceral = 7;
    });
    expect(rutas).toContain("inbody[0].grasa_visceral");
  });
});

describe("el archivo real de semilla", () => {
  it("es válido", () => {
    const ruta = resolve(process.cwd(), "supabase/semilla/datos.json");
    const datos = JSON.parse(readFileSync(ruta, "utf8"));
    const r = validarSemilla(datos);
    // Si falla, la lista de errores dice exactamente qué corregir.
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

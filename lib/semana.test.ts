import { describe, expect, it } from "vitest";
import {
  construirSemana,
  fraseSemana,
  observaciones,
  promedios,
  textoPromedioAgua,
  textoPromedioKcal,
  type ConfigSemana,
  type DiaSemanaFila,
} from "./semana";
import type { Comida, ModoComida, Porciones } from "./supabase/tipos";

// Del 6 al 12 de septiembre de 2026: domingo a sábado.
const FECHAS = [
  "2026-09-06",
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
];

const CONFIG: ConfigSemana = {
  metas_porciones: {
    cereales: 3,
    verduras: 4,
    fruta: 1,
    proteicos: 11,
    lacteos: 2,
    aceite: 1,
    grasas: 1.5,
  },
  meta_agua_ml: 2000,
};

function comida(
  fecha: string,
  tiempo: string,
  modo: ModoComida,
  porciones: Porciones,
): Comida {
  return {
    id: `${fecha}-${tiempo}`,
    user_id: "u",
    created_at: "",
    updated_at: "",
    fecha,
    tiempo: tiempo as Comida["tiempo"],
    modo,
    menu_id: null,
    nombre_menu: null,
    texto_libre: null,
    porciones,
    kcal: null,
  };
}

function fila(fecha: string, extra: Partial<DiaSemanaFila> = {}): DiaSemanaFila {
  return {
    fecha,
    agua_ml: 0,
    kcal_activas: null,
    entrenamiento: [],
    estado_tobillo: null,
    cerrado: false,
    ...extra,
  };
}

describe("construirSemana", () => {
  it("devuelve un día por fecha, en el mismo orden", () => {
    const s = construirSemana(FECHAS, [], [], CONFIG);
    expect(s).toHaveLength(7);
    expect(s.map((d) => d.fecha)).toEqual(FECHAS);
  });

  it("etiqueta cada día con su inicial y número", () => {
    const s = construirSemana(FECHAS, [], [], CONFIG);
    expect(s.map((d) => d.etiqueta)).toEqual([
      "D 6",
      "L 7",
      "M 8",
      "M 9",
      "J 10",
      "V 11",
      "S 12",
    ]);
  });

  it("una semana vacía deja todas las celdas en vacio", () => {
    const s = construirSemana(FECHAS, [], [], CONFIG);
    for (const d of s) {
      expect(d.cerrado).toBe(false);
      expect(d.estimado).toBe(false);
      expect(d.celdas).toHaveLength(7);
      for (const c of d.celdas) {
        expect(c.razon).toBe(0);
        expect(c.tono).toBe("vacio");
      }
    }
  });

  it("calcula la razón por grupo con tope en 1", () => {
    // "Pollo con arroz": 4 proteicos de 11, y nada de fruta.
    const s = construirSemana(
      FECHAS,
      [],
      [
        comida("2026-09-11", "almuerzo", "menu", {
          cereales: 1,
          verduras: 2,
          proteicos: 4,
          aceite: 0.5,
        }),
      ],
      CONFIG,
    );
    const viernes = s.find((d) => d.fecha === "2026-09-11")!;
    const celda = (g: string) => viernes.celdas.find((c) => c.grupo === g)!;

    expect(celda("proteicos").razon).toBeCloseTo(4 / 11);
    expect(celda("proteicos").tono).toBe("verde-suave");
    expect(celda("fruta").razon).toBe(0);
    expect(celda("fruta").tono).toBe("vacio");
    // El aceite llega justo a su meta.
    expect(celda("aceite").razon).toBe(0.5);
    expect(celda("verduras").razon).toBe(0.5);
  });

  it("no pasa de 1 aunque se supere la meta", () => {
    const s = construirSemana(
      FECHAS,
      [],
      [comida("2026-09-11", "almuerzo", "manual", { fruta: 3 })],
      CONFIG,
    );
    const celda = s
      .find((d) => d.fecha === "2026-09-11")!
      .celdas.find((c) => c.grupo === "fruta")!;
    expect(celda.razon).toBe(1);
    expect(celda.tono).toBe("verde");
  });

  it("un día con una comida fuera queda estimado y pinta en azul", () => {
    const s = construirSemana(
      FECHAS,
      [],
      [
        comida("2026-09-11", "cena", "fuera", { proteicos: 11 }),
        comida("2026-09-11", "almuerzo", "manual", { cereales: 1 }),
      ],
      CONFIG,
    );
    const d = s.find((x) => x.fecha === "2026-09-11")!;
    expect(d.estimado).toBe(true);
    expect(d.celdas.find((c) => c.grupo === "proteicos")!.tono).toBe("azul");
    expect(d.celdas.find((c) => c.grupo === "cereales")!.tono).toBe("azul-suave");
    // Las porciones de la comida estimada SÍ suman.
    expect(d.totales.porciones.proteicos).toBe(11);
  });

  it("marca cerrado desde la fila de dias", () => {
    const s = construirSemana(
      FECHAS,
      [fila("2026-09-11", { cerrado: true })],
      [],
      CONFIG,
    );
    expect(s.filter((d) => d.cerrado).map((d) => d.fecha)).toEqual([
      "2026-09-11",
    ]);
  });
});

describe("promedios", () => {
  it("sin datos devuelve null en los dos", () => {
    expect(promedios([])).toEqual({ agua: null, kcal: null });
    expect(promedios([fila("2026-09-11")])).toEqual({ agua: null, kcal: null });
  });

  it("ignora los días sin el dato", () => {
    const r = promedios([
      fila("2026-09-09", { agua_ml: 1500, kcal_activas: 400 }),
      fila("2026-09-10", { agua_ml: 2000 }),
      fila("2026-09-11"),
    ]);
    expect(r.agua).toBe(1750);
    expect(r.kcal).toBe(400);
  });
});

describe("textos de promedio", () => {
  it("redondea el agua a 50 ml y la muestra en litros", () => {
    expect(textoPromedioAgua(1740)).toBe("1,75 L");
    expect(textoPromedioAgua(2000)).toBe("2,00 L");
    expect(textoPromedioAgua(null)).toBe("—");
  });

  it("redondea las kcal", () => {
    expect(textoPromedioKcal(419.6)).toBe("420 kcal");
    expect(textoPromedioKcal(null)).toBe("—");
  });
});

describe("fraseSemana", () => {
  it("describe sin evaluar", () => {
    expect(fraseSemana(7)).toBe("Semana bien cubierta.");
    expect(fraseSemana(6)).toBe("Semana bien cubierta.");
    expect(fraseSemana(5)).toBe("Vas a mitad de camino esta semana.");
    expect(fraseSemana(3)).toBe("Vas a mitad de camino esta semana.");
    expect(fraseSemana(2)).toBe("Todavía quedan días por cerrar.");
    expect(fraseSemana(0)).toBe("Todavía quedan días por cerrar.");
  });
});

describe("observaciones", () => {
  it("una semana vacía no genera ninguna", () => {
    const s = construirSemana(FECHAS, [], [], CONFIG);
    expect(observaciones(s, CONFIG)).toEqual([]);
  });

  it("una semana completa y cumplida no genera ninguna", () => {
    const completas = FECHAS.flatMap((f) =>
      TIEMPOS_CLAVES.map((t) =>
        comida(f, t, "manual", { proteicos: 11, fruta: 1 }),
      ),
    );
    const dias = FECHAS.map((f) =>
      fila(f, { cerrado: true, agua_ml: 2000, kcal_activas: 400 }),
    );
    const s = construirSemana(FECHAS, dias, completas, CONFIG);
    expect(observaciones(s, CONFIG)).toEqual([]);
  });

  it("avisa de la racha de proteicos justo en 3", () => {
    // Tres días seguidos con registro y proteicos bajo 11; el cuarto corta.
    const comidas = [
      comida("2026-09-08", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-09", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-10", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-11", "almuerzo", "manual", { proteicos: 11 }),
    ];
    const s = construirSemana(FECHAS, [], comidas, CONFIG);
    const o = observaciones(s, CONFIG);
    expect(o[0]).toEqual({
      texto: "Las proteicas quedaron bajo 11 tres días seguidos.",
      sugerencia: "Un yogurt proteico en la colación PM cierra la diferencia.",
    });
  });

  it("no avisa con solo dos días seguidos", () => {
    const comidas = [
      comida("2026-09-10", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-11", "almuerzo", "manual", { proteicos: 4 }),
    ];
    const s = construirSemana(FECHAS, [], comidas, CONFIG);
    const o = observaciones(s, CONFIG);
    expect(o.some((x) => x.texto.includes("proteicas"))).toBe(false);
  });

  it("los días sin registro cortan la racha, no la alimentan", () => {
    // Dos días bajos, un día sin nada, dos días bajos: ninguna racha llega a 3.
    const comidas = [
      comida("2026-09-07", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-08", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-10", "almuerzo", "manual", { proteicos: 4 }),
      comida("2026-09-11", "almuerzo", "manual", { proteicos: 4 }),
    ];
    const s = construirSemana(FECHAS, [], comidas, CONFIG);
    expect(
      observaciones(s, CONFIG).some((x) => x.texto.includes("proteicas")),
    ).toBe(false);
  });

  it("nombra el tiempo que más se salta, contando solo días con registro", () => {
    // Un solo día con registro, y sin cena.
    const comidas = [
      comida("2026-09-11", "desayuno", "manual", { cereales: 1 }),
      comida("2026-09-11", "colacion_am", "manual", { fruta: 1 }),
      comida("2026-09-11", "almuerzo", "manual", { proteicos: 11 }),
      comida("2026-09-11", "colacion_pm", "manual", { lacteos: 1 }),
    ];
    const s = construirSemana(FECHAS, [], comidas, CONFIG);
    const o = observaciones(s, CONFIG);
    expect(o).toContainEqual({
      texto: "La cena es la que más se salta: 1 de 7 días.",
      sugerencia: "Dejarla armada la noche anterior suele bastar.",
    });
  });

  it("avisa del tobillo peor después de entrenar, y no después de kine", () => {
    const dias = [
      fila("2026-09-09", { entrenamiento: ["Core"] }),
      fila("2026-09-10", { estado_tobillo: "peor" }),
      fila("2026-09-11", { entrenamiento: ["Kinesiología", "Descanso"] }),
      fila("2026-09-12", { estado_tobillo: "peor" }),
    ];
    const s = construirSemana(FECHAS, dias, [], CONFIG);
    const o = observaciones(s, CONFIG);
    expect(o).toContainEqual({
      texto: "El tobillo estuvo peor 1 día justo después de entrenar.",
      sugerencia: "Vale la pena comentarlo en kinesiología.",
    });
  });

  describe("días estimados", () => {
    it("se describen sin tratarlos como falla", () => {
      const comidas = [
        comida("2026-09-10", "cena", "fuera", {}),
        comida("2026-09-11", "cena", "fuera", {}),
      ];
      const s = construirSemana(FECHAS, [], comidas, CONFIG);
      const o = observaciones(s, CONFIG);
      expect(o).toContainEqual({
        texto: "2 días tuvieron comidas fuera de casa.",
        sugerencia: "Quedan registrados igual, marcados como estimados.",
      });
      // Ningún texto reprocha.
      for (const x of o) {
        expect(x.texto).not.toMatch(/no cumpl|fall|incumpl|deberías/i);
      }
    });

    it("con un solo día va en singular", () => {
      const s = construirSemana(
        FECHAS,
        [],
        [comida("2026-09-11", "cena", "fuera", {})],
        CONFIG,
      );
      expect(
        observaciones(s, CONFIG).some(
          (x) => x.texto === "Un día tuvo una comida fuera de casa.",
        ),
      ).toBe(true);
    });

    it("un día estimado y completo no genera aviso de proteicos", () => {
      // Los cinco tiempos registrados, uno fuera, y la meta de proteicos llena.
      const comidas = TIEMPOS_CLAVES.map((t, i) =>
        comida("2026-09-11", t, i === 4 ? "fuera" : "manual", {
          proteicos: 3,
        }),
      );
      const s = construirSemana(FECHAS, [], comidas, CONFIG);
      const o = observaciones(s, CONFIG);
      expect(o.some((x) => x.texto.includes("proteicas"))).toBe(false);
    });
  });

  it("avisa del agua bajo el 87,5% de la meta", () => {
    const dias = [fila("2026-09-11", { agua_ml: 1500 })];
    const s = construirSemana(FECHAS, dias, [], CONFIG);
    expect(observaciones(s, CONFIG)).toContainEqual({
      texto: "El agua promedió bajo la meta diaria.",
      sugerencia: "Los días de bicicleta conviene dejar la botella a la vista.",
    });
  });

  it("no avisa del agua justo en el umbral", () => {
    // 87,5% de 2000 son exactamente 1750.
    const s = construirSemana(
      FECHAS,
      [fila("2026-09-11", { agua_ml: 1750 })],
      [],
      CONFIG,
    );
    expect(
      observaciones(s, CONFIG).some((x) => x.texto.includes("agua")),
    ).toBe(false);
  });

  it("nunca devuelve más de cuatro", () => {
    // Se disparan las cinco reglas a la vez.
    const comidas = [
      comida("2026-09-08", "desayuno", "manual", { proteicos: 1 }),
      comida("2026-09-09", "desayuno", "manual", { proteicos: 1 }),
      comida("2026-09-10", "desayuno", "manual", { proteicos: 1 }),
      comida("2026-09-11", "cena", "fuera", { proteicos: 1 }),
    ];
    const dias = [
      fila("2026-09-09", { entrenamiento: ["Core"] }),
      fila("2026-09-10", { estado_tobillo: "peor" }),
      fila("2026-09-11", { agua_ml: 500 }),
    ];
    const s = construirSemana(FECHAS, dias, comidas, CONFIG);
    expect(observaciones(s, CONFIG)).toHaveLength(4);
  });
});

const TIEMPOS_CLAVES = [
  "desayuno",
  "colacion_am",
  "almuerzo",
  "colacion_pm",
  "cena",
];

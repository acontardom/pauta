import { describe, expect, it } from "vitest";
import {
  avance,
  diasTobillo,
  franjaTobillo,
  notaTobillo,
  ordenarPreguntas,
  posicionEnPeriodo,
  proximoControl,
  resumenKine,
  type DiaTobillo,
} from "./recuperacion";
import type { EntradaRecuperacion } from "./supabase/tipos";

const OPERACION = "2026-09-04";
const RETORNO = "2027-01-01";

type Entrada = Pick<
  EntradaRecuperacion,
  "fecha" | "tipo" | "numero_sesion" | "autorizado" | "hinchazon" | "proximo_control"
>;

function entrada(extra: Partial<Entrada> & Pick<Entrada, "fecha" | "tipo">): Entrada {
  return {
    numero_sesion: null,
    autorizado: [],
    hinchazon: null,
    proximo_control: null,
    ...extra,
  };
}

// Las entradas de la semilla.
const SEMILLA: Entrada[] = [
  entrada({ fecha: "2026-09-08", tipo: "kine", numero_sesion: 1, autorizado: ["Movilidad activa"], hinchazon: "menos" }),
  entrada({ fecha: "2026-09-09", tipo: "control", proximo_control: "2026-09-23" }),
  entrada({ fecha: "2026-09-10", tipo: "kine", numero_sesion: 2, autorizado: ["Bicicleta"] }),
  entrada({ fecha: "2026-09-11", tipo: "kine", numero_sesion: 3 }),
];

function dia(fecha: string, estado: DiaTobillo["estado_tobillo"], entrenamiento: string[] = []): DiaTobillo {
  return { fecha, estado_tobillo: estado, entrenamiento };
}

describe("avance", () => {
  it("cuenta la semana desde la operación y los días al retorno", () => {
    expect(avance(OPERACION, RETORNO, "2026-09-12")).toEqual({
      semanaActual: 2,
      semanasTotales: 17,
      diasDesde: 8,
      diasRestantes: 111,
      razon: 8 / 119,
    });
  });

  it("el día de la operación es la semana 1 con avance 0", () => {
    const a = avance("2026-09-12", RETORNO, "2026-09-12");
    expect(a.semanaActual).toBe(1);
    expect(a.diasDesde).toBe(0);
    expect(a.razon).toBe(0);
    expect(a.diasRestantes).toBe(111);
  });

  it("cambia de semana al séptimo día", () => {
    expect(avance(OPERACION, RETORNO, "2026-09-10").semanaActual).toBe(1);
    expect(avance(OPERACION, RETORNO, "2026-09-11").semanaActual).toBe(2);
  });

  it("con el retorno ya pasado queda acotado: razón 1, 0 días y la última semana", () => {
    const a = avance(OPERACION, RETORNO, "2027-02-01");
    expect(a.razon).toBe(1);
    expect(a.diasRestantes).toBe(0);
    expect(a.semanaActual).toBe(17);
  });

  it("antes de la operación no hay avance ni días negativos", () => {
    const a = avance(OPERACION, RETORNO, "2026-09-01");
    expect(a.semanaActual).toBe(1);
    expect(a.diasDesde).toBe(0);
    expect(a.razon).toBe(0);
  });

  it("un período de cero días no divide por cero", () => {
    const a = avance("2026-09-12", "2026-09-12", "2026-09-12");
    expect(Number.isFinite(a.razon)).toBe(true);
    expect(a.semanasTotales).toBe(1);
  });
});

describe("posicionEnPeriodo", () => {
  it("ubica una fecha entre 0 y 1", () => {
    expect(posicionEnPeriodo(OPERACION, RETORNO, OPERACION)).toBe(0);
    expect(posicionEnPeriodo(OPERACION, RETORNO, RETORNO)).toBe(1);
    expect(posicionEnPeriodo(OPERACION, RETORNO, "2026-10-02")).toBeCloseTo(28 / 119);
    expect(posicionEnPeriodo(OPERACION, RETORNO, "2027-06-01")).toBe(1);
  });
});

describe("resumenKine", () => {
  it("con la semilla: 3 sesiones, 3 esta semana y dos autorizaciones", () => {
    expect(resumenKine(SEMILLA, "2026-09-12")).toEqual({
      total: 3,
      estaSemana: 3,
      autorizaciones: [
        { etiqueta: "Movilidad activa", numeroSesion: 1 },
        { etiqueta: "Bicicleta", numeroSesion: 2 },
      ],
    });
  });

  it("sin datos devuelve todo en cero", () => {
    expect(resumenKine([], "2026-09-12")).toEqual({
      total: 0,
      estaSemana: 0,
      autorizaciones: [],
    });
  });

  it("sin numero_sesion usa la posición cronológica", () => {
    const r = resumenKine(
      [
        entrada({ fecha: "2026-09-10", tipo: "kine", autorizado: ["Bicicleta"] }),
        entrada({ fecha: "2026-09-08", tipo: "kine", autorizado: ["Movilidad activa"] }),
      ],
      "2026-09-12",
    );
    expect(r.autorizaciones).toEqual([
      { etiqueta: "Movilidad activa", numeroSesion: 1 },
      { etiqueta: "Bicicleta", numeroSesion: 2 },
    ]);
  });

  it("lo autorizado se acumula y conserva la primera sesión", () => {
    const r = resumenKine(
      [
        entrada({ fecha: "2026-09-08", tipo: "kine", numero_sesion: 1, autorizado: ["Bicicleta"] }),
        entrada({ fecha: "2026-09-10", tipo: "kine", numero_sesion: 2, autorizado: ["Bicicleta", " Core "] }),
      ],
      "2026-09-12",
    );
    expect(r.autorizaciones).toEqual([
      { etiqueta: "Bicicleta", numeroSesion: 1 },
      { etiqueta: "Core", numeroSesion: 2 },
    ]);
  });

  it("no cuenta sesiones futuras ni las de hace más de 7 días en la semana", () => {
    const r = resumenKine(
      [
        entrada({ fecha: "2026-09-01", tipo: "kine", numero_sesion: 1 }),
        entrada({ fecha: "2026-09-12", tipo: "kine", numero_sesion: 2 }),
        entrada({ fecha: "2026-09-20", tipo: "kine", numero_sesion: 3, autorizado: ["Trote"] }),
      ],
      "2026-09-12",
    );
    expect(r.total).toBe(2);
    expect(r.estaSemana).toBe(1);
    expect(r.autorizaciones).toEqual([]);
  });

  it("ignora los controles y las notas", () => {
    expect(resumenKine([entrada({ fecha: "2026-09-09", tipo: "control" })], "2026-09-12").total).toBe(0);
  });
});

describe("diasTobillo", () => {
  it("toma la hinchazón de la sesión de kine si el día no tiene el tobillo registrado", () => {
    const d = diasTobillo([{ fecha: "2026-09-11", estado_tobillo: "igual", entrenamiento: [] }], SEMILLA, "2026-09-12");
    expect(d).toEqual([dia("2026-09-08", "mejor"), dia("2026-09-11", "igual")]);
  });

  it("el tobillo registrado en el día manda sobre la hinchazón", () => {
    const d = diasTobillo(
      [{ fecha: "2026-09-08", estado_tobillo: "peor", entrenamiento: ["Core"] }],
      SEMILLA,
      "2026-09-12",
    );
    expect(d[0]).toEqual(dia("2026-09-08", "peor", ["Core"]));
  });

  it("traduce las tres hinchazones y deja fuera lo que está fuera de la ventana", () => {
    const d = diasTobillo(
      [],
      [
        entrada({ fecha: "2026-07-01", tipo: "kine", hinchazon: "mas" }),
        entrada({ fecha: "2026-09-09", tipo: "kine", hinchazon: "igual" }),
        entrada({ fecha: "2026-09-10", tipo: "kine", hinchazon: "mas" }),
      ],
      "2026-09-12",
    );
    expect(d.map((x) => [x.fecha, x.estado_tobillo])).toEqual([
      ["2026-09-09", "igual"],
      ["2026-09-10", "peor"],
    ]);
  });

  it("con dos sesiones el mismo día gana la última", () => {
    const d = diasTobillo(
      [],
      [
        entrada({ fecha: "2026-09-10", tipo: "kine", hinchazon: "mas" }),
        entrada({ fecha: "2026-09-10", tipo: "kine", hinchazon: "menos" }),
      ],
      "2026-09-12",
    );
    expect(d).toEqual([dia("2026-09-10", "mejor")]);
  });
});

describe("franjaTobillo", () => {
  it("sin datos son 30 celdas vacías, la última es hoy", () => {
    const f = franjaTobillo([], "2026-09-12");
    expect(f).toHaveLength(30);
    expect(f[0].fecha).toBe("2026-08-14");
    expect(f[29].fecha).toBe("2026-09-12");
    expect(f.every((c) => c.estado === null)).toBe(true);
  });

  it("ubica cada estado en su fecha", () => {
    const f = franjaTobillo(diasTobillo([], SEMILLA, "2026-09-12"), "2026-09-12");
    expect(f.find((c) => c.fecha === "2026-09-08")!.estado).toBe("mejor");
    expect(f.filter((c) => c.estado !== null)).toHaveLength(1);
  });
});

describe("notaTobillo", () => {
  it("1. peor después de entrenar en 2 o más ocasiones", () => {
    const nota = notaTobillo([
      dia("2026-09-01", null, ["Core"]),
      dia("2026-09-02", "peor"),
      dia("2026-09-05", null, ["Bicicleta"]),
      dia("2026-09-06", "peor"),
      dia("2026-09-07", "mejor"),
    ]);
    expect(nota).toBe("El tobillo estuvo peor los días siguientes a entrenar en 2 ocasiones.");
  });

  it("kinesiología y descanso no cuentan como entrenar", () => {
    const nota = notaTobillo([
      dia("2026-09-01", null, ["Kinesiología"]),
      dia("2026-09-02", "peor"),
      dia("2026-09-05", null, ["Descanso"]),
      dia("2026-09-06", "peor"),
    ]);
    expect(nota).not.toContain("después de entrenar");
    expect(nota).not.toContain("siguientes a entrenar");
  });

  it("2. ningún día peor y alguno mejor", () => {
    expect(notaTobillo([dia("2026-09-08", "mejor"), dia("2026-09-11", "igual")])).toBe(
      "En los últimos 30 días el tobillo nunca se registró peor.",
    );
  });

  it("3. al menos tantos días mejor como peor", () => {
    expect(
      notaTobillo([dia("2026-09-01", "mejor"), dia("2026-09-03", "mejor"), dia("2026-09-05", "peor")]),
    ).toBe("Más días mejor (2) que peor (1) en los últimos 30 días.");
  });

  it("4. días peor sin relación clara con el entrenamiento", () => {
    expect(notaTobillo([dia("2026-09-02", "peor"), dia("2026-09-05", "peor")])).toBe(
      "2 días peor en el último mes, sin relación clara con el entrenamiento.",
    );
    // Una sola ocasión después de entrenar no alcanza la regla 1.
    expect(notaTobillo([dia("2026-09-01", null, ["Core"]), dia("2026-09-02", "peor")])).toBe(
      "1 día peor en el último mes, sin relación clara con el entrenamiento.",
    );
  });

  it("5. sin datos suficientes", () => {
    const esperado = "Todavía no hay suficientes registros de tobillo este mes.";
    expect(notaTobillo([])).toBe(esperado);
    expect(notaTobillo([dia("2026-09-11", "igual")])).toBe(esperado);
  });
});

describe("proximoControl", () => {
  it("con la semilla es el 23 de septiembre", () => {
    expect(proximoControl(SEMILLA)).toBe("2026-09-23");
  });

  it("sin controles devuelve null", () => {
    expect(proximoControl([])).toBe(null);
    expect(proximoControl([entrada({ fecha: "2026-09-08", tipo: "kine" })])).toBe(null);
  });

  it("toma el del control más reciente que la tenga", () => {
    expect(
      proximoControl([
        entrada({ fecha: "2026-09-09", tipo: "control", proximo_control: "2026-09-23" }),
        entrada({ fecha: "2026-09-23", tipo: "control", proximo_control: "2026-10-14" }),
        // El último control no dejó fecha: vale la del anterior.
        entrada({ fecha: "2026-09-30", tipo: "control" }),
      ]),
    ).toBe("2026-10-14");
  });
});

describe("ordenarPreguntas", () => {
  const p = (texto: string, preguntada: boolean, created_at: string) => ({ texto, preguntada, created_at });

  it("primero las pendientes, las más nuevas arriba", () => {
    const orden = ordenarPreguntas([
      p("vieja pendiente", false, "2026-09-10T10:00:00Z"),
      p("preguntada", true, "2026-09-12T10:00:00Z"),
      p("nueva pendiente", false, "2026-09-12T09:00:00Z"),
    ]);
    expect(orden.map((x) => x.texto)).toEqual(["nueva pendiente", "vieja pendiente", "preguntada"]);
  });

  it("con la misma fecha de creación desempata por texto, siempre igual", () => {
    const misma = "2026-09-11T19:00:00Z";
    const orden = ordenarPreguntas([p("¿Cuándo trotar?", false, misma), p("¿Aceite?", false, misma)]);
    expect(orden.map((x) => x.texto)).toEqual(["¿Aceite?", "¿Cuándo trotar?"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  avance,
  diasTobillo,
  diferenciaCumplimiento,
  franjaTobillo,
  lineaTiempo,
  notaHito,
  notaTobillo,
  ordenarPreguntas,
  posicionEnPeriodo,
  proximoControl,
  resumenKine,
  siguienteSesion,
  textoHistorial,
  type DiaTobillo,
  type ItemLinea,
} from "./recuperacion";
import type { EntradaRecuperacion, Hito } from "./supabase/tipos";

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

describe("siguienteSesion", () => {
  it("con la semilla sugiere la 4", () => {
    expect(siguienteSesion(SEMILLA)).toBe(4);
  });

  it("sin sesiones sugiere la 1", () => {
    expect(siguienteSesion([])).toBe(1);
  });

  it("usa el mayor número aunque haya menos sesiones registradas", () => {
    expect(siguienteSesion([entrada({ fecha: "2026-09-10", tipo: "kine", numero_sesion: 7 })])).toBe(8);
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

/* ------------------------------------------------------------------------- */
/* Hitos y línea de tiempo                                                   */
/* ------------------------------------------------------------------------- */

function hito(extra: Partial<Hito> & Pick<Hito, "nombre">): Hito {
  return {
    id: extra.nombre,
    user_id: "u",
    created_at: "",
    updated_at: "",
    clave: null,
    fecha_planificada: null,
    fecha_real: null,
    cumplido: false,
    fijo: false,
    historial: [],
    ...extra,
  };
}

function entradaCompleta(
  extra: Partial<EntradaRecuperacion> & Pick<EntradaRecuperacion, "fecha" | "tipo">,
): EntradaRecuperacion {
  return {
    id: `${extra.fecha}-${extra.tipo}-${extra.numero_sesion ?? ""}`,
    user_id: "u",
    created_at: "",
    updated_at: "",
    numero_sesion: null,
    autorizado: [],
    hinchazon: null,
    indicaciones: null,
    nota: null,
    proximo_control: null,
    ...extra,
  };
}

const HITOS_SEMILLA: Hito[] = [
  hito({ nombre: "Operación de tobillo", fecha_planificada: "2026-09-04", fecha_real: "2026-09-04", cumplido: true, fijo: true }),
  hito({ nombre: "Fin del período sin apoyo", fecha_planificada: "2026-10-02", fijo: true }),
  hito({ nombre: "Inicio de carga completa", fecha_planificada: "2026-10-16", fijo: true }),
  hito({ nombre: "Retorno a la actividad normal", fecha_planificada: "2027-01-01", fijo: true }),
  hito({ nombre: "Vuelta a la marcha sin muletas", fijo: true }),
];

const ENTRADAS_SEMILLA: EntradaRecuperacion[] = [
  entradaCompleta({ fecha: "2026-09-08", tipo: "kine", numero_sesion: 1, autorizado: ["Movilidad activa"], hinchazon: "menos" }),
  entradaCompleta({ fecha: "2026-09-09", tipo: "control", proximo_control: "2026-09-23", nota: "Control con la doctora, todo se ve bien" }),
  entradaCompleta({ fecha: "2026-09-10", tipo: "kine", numero_sesion: 2, autorizado: ["Bicicleta"] }),
  entradaCompleta({ fecha: "2026-09-11", tipo: "kine", numero_sesion: 3 }),
];

// Después del próximo control de la semilla (23 sep): no hay control agendado.
const PASADO_EL_CONTROL = "2026-09-30";

describe("lineaTiempo", () => {
  it("con la semilla: 5 hitos y 4 entradas en orden, el hito sin fecha al final", () => {
    const items = lineaTiempo(HITOS_SEMILLA, ENTRADAS_SEMILLA, PASADO_EL_CONTROL);
    expect(items.map((i) => i.titulo)).toEqual([
      "Operación de tobillo",
      "Sesión 1 · Movilidad activa",
      "Control médico",
      "Sesión 2 · Bicicleta",
      "Sesión 3 · sin cambios",
      "Fin del período sin apoyo",
      "Inicio de carga completa",
      "Retorno a la actividad normal",
      "Vuelta a la marcha sin muletas",
    ]);
    const ultimo = items[items.length - 1];
    expect(ultimo.fecha).toBe(null);
    expect(ultimo.tipo).toBe("Hito planificado");
  });

  it("marca el hito cumplido como destacado", () => {
    const [operacion] = lineaTiempo(HITOS_SEMILLA, [], PASADO_EL_CONTROL);
    expect(operacion.grupo).toBe("hito");
    expect(operacion.tipo).toBe("Hito cumplido");
    expect(operacion.destacado).toBe(true);
    expect(operacion.notaHito).toEqual({ texto: "Cumplido en la fecha planificada.", tono: "neutro" });
  });

  it("una sesión sin autorizaciones nuevas va sin destacar, con 'sin cambios'", () => {
    const sesion3 = lineaTiempo([], ENTRADAS_SEMILLA, PASADO_EL_CONTROL).find((i) => i.titulo.startsWith("Sesión 3"))!;
    expect(sesion3.grupo).toBe("kine");
    expect(sesion3.titulo).toBe("Sesión 3 · sin cambios");
    expect(sesion3.destacado).toBe(false);
  });

  it("repetir algo ya autorizado también es 'sin cambios'", () => {
    const items = lineaTiempo(
      [],
      [
        entradaCompleta({ fecha: "2026-09-08", tipo: "kine", numero_sesion: 1, autorizado: ["Bicicleta"] }),
        entradaCompleta({ fecha: "2026-09-10", tipo: "kine", numero_sesion: 2, autorizado: ["Bicicleta", "Propiocepción"] }),
        entradaCompleta({ fecha: "2026-09-12", tipo: "kine", numero_sesion: 3, autorizado: ["Bicicleta"] }),
      ],
      PASADO_EL_CONTROL,
    );
    expect(items.map((i) => i.titulo)).toEqual([
      "Sesión 1 · Bicicleta",
      "Sesión 2 · Propiocepción",
      "Sesión 3 · sin cambios",
    ]);
  });

  it("los controles llevan indicaciones, próximo control y nota como líneas", () => {
    const control = lineaTiempo(
      [],
      [entradaCompleta({ fecha: "2026-09-09", tipo: "control", indicaciones: " Carga parcial ", proximo_control: "2026-10-21", nota: "Todo bien" })],
      PASADO_EL_CONTROL,
    )[0];
    expect(control.grupo).toBe("control");
    expect(control.tipo).toBe("Control médico");
    expect(control.lineas).toEqual([
      "Indicaciones: Carga parcial",
      "Próximo control: miércoles 21 de octubre",
      "Todo bien",
    ]);
  });

  it("con fechas repetidas: primero los hitos y después las entradas, en el orden de llegada", () => {
    const items = lineaTiempo(
      [hito({ nombre: "Hito del 10", fecha_planificada: "2026-09-10" })],
      [
        entradaCompleta({ id: "a", fecha: "2026-09-10", tipo: "nota", nota: "primera nota" }),
        entradaCompleta({ id: "b", fecha: "2026-09-10", tipo: "nota", nota: "segunda nota" }),
      ],
      PASADO_EL_CONTROL,
    );
    expect(items.map((i) => i.clave)).toEqual(["hito-Hito del 10", "entrada-a", "entrada-b"]);
  });

  it("un hito ordena por su fecha real, no por la planificada", () => {
    const items = lineaTiempo(
      [hito({ nombre: "Adelantado", fecha_planificada: "2026-10-16", fecha_real: "2026-09-01", cumplido: true })],
      ENTRADAS_SEMILLA,
      PASADO_EL_CONTROL,
    );
    expect(items[0].titulo).toBe("Adelantado");
  });
});

describe("lineaTiempo: control agendado", () => {
  // La semilla agenda el próximo control para el 23 de septiembre.
  const HOY = "2026-09-14";
  const agendados = (items: ItemLinea[]) => items.filter((i) => i.agendado);

  it("sin próximo control no agrega nada", () => {
    const items = lineaTiempo([], [entradaCompleta({ fecha: "2026-09-09", tipo: "control" })], HOY);
    expect(agendados(items)).toEqual([]);
  });

  it("con uno futuro, lo agrega en su fecha con la distancia", () => {
    const items = lineaTiempo(HITOS_SEMILLA, ENTRADAS_SEMILLA, HOY);
    const lista = agendados(items);
    expect(lista).toHaveLength(1);

    const [agendado] = lista;
    expect(agendado).toMatchObject({
      grupo: "control",
      fecha: "2026-09-23",
      tipo: "Control agendado",
      titulo: "Control médico",
      lineas: ["en 9 días"],
      destacado: false,
    });
    // Abre un registro nuevo en su propia fecha, no el control que lo agendó.
    expect(agendado.origen).toEqual({ tipo: "agendado", fecha: "2026-09-23" });

    // Ordenado por su fecha, entre la sesión del 11 sep y el hito del 2 oct.
    const i = items.indexOf(agendado);
    expect(items[i - 1].titulo).toBe("Sesión 3 · sin cambios");
    expect(items[i + 1].titulo).toBe("Fin del período sin apoyo");
  });

  it("la víspera dice 'mañana' y el mismo día dice 'hoy'", () => {
    expect(agendados(lineaTiempo([], ENTRADAS_SEMILLA, "2026-09-22"))[0].lineas).toEqual(["mañana"]);
    expect(agendados(lineaTiempo([], ENTRADAS_SEMILLA, "2026-09-23"))[0].lineas).toEqual(["hoy"]);
  });

  it("con uno ya pasado no agrega nada", () => {
    expect(agendados(lineaTiempo([], ENTRADAS_SEMILLA, "2026-09-24"))).toEqual([]);
  });

  it("con el control ya registrado en esa fecha, deja de aparecer", () => {
    const conControl = [
      ...ENTRADAS_SEMILLA,
      entradaCompleta({ fecha: "2026-09-23", tipo: "control", nota: "Control del 23" }),
    ];
    expect(agendados(lineaTiempo([], conControl, HOY))).toEqual([]);
  });
});

describe("notaHito", () => {
  it("un hito sin fecha planificada y sin cambios no dice nada", () => {
    expect(notaHito(hito({ nombre: "x" }))).toEqual({ texto: "", tono: "neutro" });
    // Cumplido pero sin planificada: no hay con qué comparar.
    expect(notaHito(hito({ nombre: "x", fecha_real: "2026-09-10", cumplido: true }))).toEqual({ texto: "", tono: "neutro" });
  });

  it("cumplido antes es bueno; en la fecha y después, neutro", () => {
    const base = { nombre: "x", fecha_planificada: "2026-10-16", cumplido: true };
    expect(notaHito(hito({ ...base, fecha_real: "2026-10-13" }))).toEqual({
      texto: "Cumplido 3 días antes de lo previsto (16 oct).",
      tono: "bueno",
    });
    expect(notaHito(hito({ ...base, fecha_real: "2026-10-21" }))).toEqual({
      texto: "Cumplido 5 días después de lo previsto (16 oct).",
      tono: "neutro",
    });
    expect(notaHito(hito({ ...base, fecha_real: "2026-10-16" }))).toEqual({
      texto: "Cumplido en la fecha planificada.",
      tono: "neutro",
    });
    expect(notaHito(hito({ ...base, fecha_real: "2026-10-15" })).texto).toBe(
      "Cumplido 1 día antes de lo previsto (16 oct).",
    );
  });

  it("atrasado va en ámbar con el motivo", () => {
    const h = hito({
      nombre: "Inicio de carga completa",
      fecha_planificada: "2026-10-23",
      historial: [{ desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" }],
    });
    expect(notaHito(h)).toEqual({ texto: "Movido desde 16 oct · Control lo movió", tono: "ambar" });
  });

  it("con dos cambios cuenta el último; adelantar va en verde", () => {
    const h = hito({
      nombre: "Inicio de carga completa",
      fecha_planificada: "2026-10-20",
      historial: [
        { desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" },
        { desde: "2026-10-23", hasta: "2026-10-20", motivo: null, fecha_cambio: "2026-09-20" },
      ],
    });
    expect(notaHito(h)).toEqual({ texto: "Adelantado desde 23 oct", tono: "bueno" });
  });

  it("cumplido con historial cuenta el cumplimiento, no el último cambio", () => {
    const h = hito({
      nombre: "x",
      fecha_planificada: "2026-10-23",
      fecha_real: "2026-10-23",
      cumplido: true,
      historial: [{ desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" }],
    });
    expect(notaHito(h).texto).toBe("Cumplido en la fecha planificada.");
  });
});

describe("textoHistorial", () => {
  it("una línea por cambio, sin borrar los anteriores", () => {
    expect(
      textoHistorial([
        { desde: "2026-10-16", hasta: "2026-10-23", motivo: "Control lo movió", fecha_cambio: "2026-09-12" },
        { desde: "2026-10-23", hasta: "2026-10-20", motivo: null, fecha_cambio: "2026-09-20" },
      ]),
    ).toEqual([
      "16 oct → 23 oct · Control lo movió · registrado el 12 sep",
      "23 oct → 20 oct · registrado el 20 sep",
    ]);
  });

  it("una fecha quitada se lee como 'sin fecha'", () => {
    expect(textoHistorial([{ desde: "2026-10-16", hasta: null, motivo: null, fecha_cambio: "2026-09-12" }])).toEqual([
      "16 oct → sin fecha · registrado el 12 sep",
    ]);
  });

  it("sin historial no hay líneas", () => {
    expect(textoHistorial([])).toEqual([]);
    expect(textoHistorial(null)).toEqual([]);
  });
});

describe("diferenciaCumplimiento", () => {
  it("antes en verde, después en ámbar y en la fecha en neutro", () => {
    expect(diferenciaCumplimiento("2026-10-16", "2026-10-13")).toEqual({ texto: "3 días antes de lo previsto", tono: "bueno" });
    expect(diferenciaCumplimiento("2026-10-16", "2026-10-21")).toEqual({ texto: "5 días después", tono: "ambar" });
    expect(diferenciaCumplimiento("2026-10-16", "2026-10-16")).toEqual({ texto: "En la fecha planificada.", tono: "neutro" });
  });

  it("sin fecha planificada lo dice; sin fecha real no dice nada", () => {
    expect(diferenciaCumplimiento(null, "2026-10-16").texto).toBe("Sin fecha planificada con la que comparar.");
    expect(diferenciaCumplimiento("2026-10-16", null)).toEqual({ texto: "", tono: "neutro" });
  });
});

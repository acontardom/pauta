import {
  diferenciaDias,
  formatoCorto,
  formatoLargo,
  sumarDias,
} from "@/lib/fechas";
import type {
  CambioHito,
  Dia,
  EntradaRecuperacion,
  EstadoTobillo,
  Hinchazon,
  Hito,
} from "@/lib/supabase/tipos";

/*
  Lógica de Recuperación: avance del período, kinesiología, tobillo, próximo
  control, línea de tiempo e hitos. Todo puro y sin JSX.

  Esta pantalla registra una recuperación, no la evalúa: ninguna función
  produce un juicio. "Peor" en el tobillo es un dato más.
*/

const DIAS_FRANJA = 30;

function acotar(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** "1 día", "3 días". */
function dias(n: number): string {
  return `${n} ${n === 1 ? "día" : "días"}`;
}

/** "Miércoles 23 de septiembre" → "miércoles 23 de septiembre", para ir a mitad de frase. */
function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/* ------------------------------------------------------------------------- */
/* Avance                                                                    */
/* ------------------------------------------------------------------------- */

export type Avance = {
  /** Parte en 1 el día de la operación. */
  semanaActual: number;
  semanasTotales: number;
  diasDesde: number;
  diasRestantes: number;
  /** Entre 0 y 1. */
  razon: number;
};

export function avance(
  fechaOperacion: string,
  fechaRetorno: string,
  hoy: string,
): Avance {
  // Un período de 0 días no puede dividir por cero.
  const periodo = Math.max(1, diferenciaDias(fechaOperacion, fechaRetorno));
  const desde = diferenciaDias(fechaOperacion, hoy);
  const semanasTotales = Math.max(1, Math.ceil(periodo / 7));

  return {
    // Tope en las semanas totales: pasado el retorno no se lee "Semana 19 de 17".
    semanaActual: Math.min(
      semanasTotales,
      Math.max(1, Math.floor(Math.max(0, desde) / 7) + 1),
    ),
    semanasTotales,
    diasDesde: Math.max(0, desde),
    diasRestantes: Math.max(0, diferenciaDias(hoy, fechaRetorno)),
    razon: acotar(desde / periodo),
  };
}

/** Dónde cae una fecha dentro del período, entre 0 y 1. Para las marcas de hitos. */
export function posicionEnPeriodo(
  fechaOperacion: string,
  fechaRetorno: string,
  fecha: string,
): number {
  const periodo = Math.max(1, diferenciaDias(fechaOperacion, fechaRetorno));
  return acotar(diferenciaDias(fechaOperacion, fecha) / periodo);
}

/* ------------------------------------------------------------------------- */
/* Kinesiología                                                              */
/* ------------------------------------------------------------------------- */

export type Autorizacion = { etiqueta: string; numeroSesion: number };

export type ResumenKine = {
  /** Sesiones hasta hoy. */
  total: number;
  /** Sesiones de los últimos 7 días, hoy incluido. */
  estaSemana: number;
  /** Cada cosa autorizada, con la primera sesión en que apareció. */
  autorizaciones: Autorizacion[];
};

type EntradaKine = Pick<
  EntradaRecuperacion,
  "fecha" | "tipo" | "numero_sesion" | "autorizado"
>;

/** Orden cronológico estable: dos entradas del mismo día respetan su orden. */
function cronologico<T extends { fecha: string }>(lista: T[]): T[] {
  return lista
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.fecha.localeCompare(b.e.fecha) || a.i - b.i)
    .map((x) => x.e);
}

/*
  La lista de lo autorizado es ACUMULATIVA: lo que se autorizó en la sesión 1
  sigue autorizado en la 3 aunque no se repita. Cada cosa aparece una vez, con
  el número de la sesión en que se autorizó por primera vez.
*/
export function resumenKine(entradas: EntradaKine[], hoy: string): ResumenKine {
  const sesiones = cronologico(entradas.filter((e) => e.tipo === "kine")).filter(
    (e) => e.fecha <= hoy,
  );
  const inicioSemana = sumarDias(hoy, -6);

  const primeraVez = new Map<string, number>();
  sesiones.forEach((sesion, i) => {
    // numero_sesion si lo tiene; si no, la posición cronológica.
    const numero = sesion.numero_sesion ?? i + 1;
    for (const bruto of sesion.autorizado ?? []) {
      const etiqueta = bruto.trim();
      if (etiqueta && !primeraVez.has(etiqueta)) primeraVez.set(etiqueta, numero);
    }
  });

  return {
    total: sesiones.length,
    estaSemana: sesiones.filter((s) => s.fecha >= inicioSemana).length,
    // Un Map conserva el orden de inserción: el orden en que se autorizaron.
    autorizaciones: [...primeraVez].map(([etiqueta, numeroSesion]) => ({
      etiqueta,
      numeroSesion,
    })),
  };
}

/** El número que le correspondería a la próxima sesión, para sugerirlo. */
export function siguienteSesion(
  entradas: Pick<EntradaRecuperacion, "tipo" | "numero_sesion">[],
): number {
  const sesiones = entradas.filter((e) => e.tipo === "kine");
  const mayor = Math.max(0, ...sesiones.map((e) => e.numero_sesion ?? 0));
  return Math.max(mayor, sesiones.length) + 1;
}

/* ------------------------------------------------------------------------- */
/* Tobillo                                                                   */
/* ------------------------------------------------------------------------- */

export type DiaTobillo = {
  fecha: string;
  estado_tobillo: EstadoTobillo | null;
  entrenamiento: string[];
};

/* Cómo se lee la hinchazón de una sesión de kine como estado del tobillo. */
const DE_HINCHAZON: Record<Hinchazon, EstadoTobillo> = {
  menos: "mejor",
  igual: "igual",
  mas: "peor",
};

/*
  Los días de tobillo de los últimos 30 días, juntando dos fuentes:

  1. El tobillo registrado en el día (dias.estado_tobillo). Siempre manda.
  2. La hinchazón de una sesión de kine, para los días que no tienen el tobillo
     registrado. Una sesión anota cómo estaba el tobillo ese día; sin esto, un
     día con kine pero sin registro en Hoy quedaría vacío en la franja.

  Si hay dos sesiones el mismo día, gana la última.
*/
export function diasTobillo(
  dias: Pick<Dia, "fecha" | "estado_tobillo" | "entrenamiento">[],
  entradas: Pick<EntradaRecuperacion, "fecha" | "tipo" | "hinchazon">[],
  hoy: string,
): DiaTobillo[] {
  const desde = sumarDias(hoy, -(DIAS_FRANJA - 1));
  const enVentana = (fecha: string) => fecha >= desde && fecha <= hoy;

  const porFecha = new Map<string, DiaTobillo>();
  const conRegistroPropio = new Set<string>();

  for (const d of dias) {
    if (!enVentana(d.fecha)) continue;
    porFecha.set(d.fecha, {
      fecha: d.fecha,
      estado_tobillo: d.estado_tobillo ?? null,
      entrenamiento: d.entrenamiento ?? [],
    });
    if (d.estado_tobillo) conRegistroPropio.add(d.fecha);
  }

  for (const e of cronologico(entradas)) {
    if (e.tipo !== "kine" || !e.hinchazon || !enVentana(e.fecha)) continue;
    if (conRegistroPropio.has(e.fecha)) continue;
    porFecha.set(e.fecha, {
      fecha: e.fecha,
      estado_tobillo: DE_HINCHAZON[e.hinchazon],
      entrenamiento: porFecha.get(e.fecha)?.entrenamiento ?? [],
    });
  }

  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type CeldaTobillo = { fecha: string; estado: EstadoTobillo | null };

/** 30 celdas, de la más antigua a hoy. Un día sin registro queda en null. */
export function franjaTobillo(dias: DiaTobillo[], hoy: string): CeldaTobillo[] {
  const desde = sumarDias(hoy, -(DIAS_FRANJA - 1));
  const porFecha = new Map(dias.map((d) => [d.fecha, d.estado_tobillo]));

  return Array.from({ length: DIAS_FRANJA }, (_, i) => {
    const fecha = sumarDias(desde, i);
    return { fecha, estado: porFecha.get(fecha) ?? null };
  });
}

/** El entrenamiento que puede cargar el tobillo: no cuenta descansar ni kine. */
function entrenoDeCarga(entrenamiento: string[] | null | undefined): boolean {
  return (entrenamiento ?? []).some(
    (t) => t !== "Descanso" && t !== "Kinesiología",
  );
}

/*
  Una frase que describe el mes del tobillo, sin juzgarlo. La primera regla que
  aplica es la que se muestra.
*/
export function notaTobillo(dias: DiaTobillo[]): string {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  let peor = 0;
  let mejor = 0;
  let peorTrasEntrenar = 0;

  for (const d of dias) {
    if (d.estado_tobillo === "mejor") mejor++;
    if (d.estado_tobillo === "peor") {
      peor++;
      const anterior = porFecha.get(sumarDias(d.fecha, -1));
      if (anterior && entrenoDeCarga(anterior.entrenamiento)) peorTrasEntrenar++;
    }
  }

  if (peorTrasEntrenar >= 2) {
    return `El tobillo estuvo peor los días siguientes a entrenar en ${peorTrasEntrenar} ocasiones.`;
  }
  if (peor === 0 && mejor > 0) {
    return "En los últimos 30 días el tobillo nunca se registró peor.";
  }
  if (mejor >= peor && mejor > 0) {
    return `Más días mejor (${mejor}) que peor (${peor}) en los últimos 30 días.`;
  }
  if (peor > 0) {
    return `${peor} ${peor === 1 ? "día" : "días"} peor en el último mes, sin relación clara con el entrenamiento.`;
  }
  return "Todavía no hay suficientes registros de tobillo este mes.";
}

/* ------------------------------------------------------------------------- */
/* Próximo control y preguntas                                               */
/* ------------------------------------------------------------------------- */

/**
 * La fecha de próximo control del control más reciente que la tenga, o null.
 * Si el último control no dejó fecha, vale la de un control anterior.
 */
export function proximoControl(
  entradas: Pick<EntradaRecuperacion, "fecha" | "tipo" | "proximo_control">[],
): string | null {
  return controlQueAgenda(entradas)?.proximo_control ?? null;
}

/** El control más reciente que dejó fecha de próximo control, o null. */
function controlQueAgenda<
  T extends Pick<EntradaRecuperacion, "fecha" | "tipo" | "proximo_control">,
>(entradas: T[]): T | null {
  const controles = cronologico(
    entradas.filter((e) => e.tipo === "control" && e.proximo_control),
  );
  return controles[controles.length - 1] ?? null;
}

/** "hoy", "mañana", "en 9 días". */
function textoDistancia(diasHasta: number): string {
  if (diasHasta === 0) return "hoy";
  if (diasHasta === 1) return "mañana";
  return `en ${dias(diasHasta)}`;
}

/*
  Primero las pendientes y, dentro de cada grupo, las más nuevas primero.

  El desempate por texto no es cosmético: la semilla insertó todas las
  preguntas en el mismo instante, y sin él su orden cambiaría entre recargas.
*/
export function ordenarPreguntas<
  T extends { preguntada: boolean; created_at: string; texto: string },
>(preguntas: T[]): T[] {
  return [...preguntas].sort(
    (a, b) =>
      Number(a.preguntada) - Number(b.preguntada) ||
      b.created_at.localeCompare(a.created_at) ||
      a.texto.localeCompare(b.texto, "es"),
  );
}

/* ------------------------------------------------------------------------- */
/* Hitos                                                                     */
/* ------------------------------------------------------------------------- */

/*
  Tono de una nota de hito. Adelantar va en verde ("bueno"), atrasar en ámbar.
  No existe un tono de falla: un hito que se mueve es información.
*/
export type TonoNota = "bueno" | "ambar" | "neutro";
export type NotaHito = { texto: string; tono: TonoNota };

const SIN_NOTA: NotaHito = { texto: "", tono: "neutro" };

export function notaHito(
  hito: Pick<Hito, "fecha_planificada" | "fecha_real" | "cumplido" | "historial">,
): NotaHito {
  const planificada = hito.fecha_planificada;

  if (hito.cumplido && hito.fecha_real) {
    // Sin fecha planificada no hay con qué comparar.
    if (!planificada) return SIN_NOTA;
    const diferencia = diferenciaDias(planificada, hito.fecha_real);
    if (diferencia === 0) {
      return { texto: "Cumplido en la fecha planificada.", tono: "neutro" };
    }
    if (diferencia < 0) {
      return {
        texto: `Cumplido ${dias(-diferencia)} antes de lo previsto (${formatoCorto(planificada)}).`,
        tono: "bueno",
      };
    }
    return {
      texto: `Cumplido ${dias(diferencia)} después de lo previsto (${formatoCorto(planificada)}).`,
      tono: "neutro",
    };
  }

  // Sin cumplir: si la fecha se movió, se cuenta el último cambio.
  const historial = hito.historial ?? [];
  const ultimo = historial[historial.length - 1];
  if (ultimo?.desde) {
    // Si se quitó la fecha (hasta en null) no se puede decir si se adelantó.
    const adelanto = ultimo.hasta != null && ultimo.hasta < ultimo.desde;
    const atraso = ultimo.hasta != null && ultimo.hasta > ultimo.desde;
    return {
      texto:
        `${adelanto ? "Adelantado desde" : "Movido desde"} ${formatoCorto(ultimo.desde)}` +
        (ultimo.motivo ? ` · ${ultimo.motivo}` : ""),
      tono: adelanto ? "bueno" : atraso ? "ambar" : "neutro",
    };
  }

  return SIN_NOTA;
}

/**
 * Para la hoja de hitos, al marcar uno como cumplido: cuánto se adelantó o se
 * atrasó respecto de lo planificado.
 */
export function diferenciaCumplimiento(
  planificada: string | null,
  real: string | null,
): NotaHito {
  if (!real) return SIN_NOTA;
  if (!planificada) {
    return { texto: "Sin fecha planificada con la que comparar.", tono: "neutro" };
  }
  const diferencia = diferenciaDias(planificada, real);
  if (diferencia === 0) return { texto: "En la fecha planificada.", tono: "neutro" };
  if (diferencia < 0) {
    return { texto: `${dias(-diferencia)} antes de lo previsto`, tono: "bueno" };
  }
  // Atrasarse va en ámbar, igual que en la línea de tiempo.
  return { texto: `${dias(diferencia)} después`, tono: "ambar" };
}

/** Una línea por cambio: "16 oct → 23 oct · motivo · registrado el 12 sep". */
export function textoHistorial(historial: CambioHito[] | null | undefined): string[] {
  const corto = (fecha: string | null) => (fecha ? formatoCorto(fecha) : "sin fecha");
  return (historial ?? []).map(
    (c) =>
      `${corto(c.desde)} → ${corto(c.hasta)}` +
      (c.motivo ? ` · ${c.motivo}` : "") +
      (c.fecha_cambio ? ` · registrado el ${formatoCorto(c.fecha_cambio)}` : ""),
  );
}

/* ------------------------------------------------------------------------- */
/* Línea de tiempo                                                           */
/* ------------------------------------------------------------------------- */

/** Sirve para filtrar: "Controles" muestra control e hito; "Kinesiología", kine. */
export type GrupoLinea = "hito" | "control" | "kine" | "nota";

export type ItemLinea = {
  clave: string;
  grupo: GrupoLinea;
  /** La fecha por la que se ordena y que se muestra. null: hito sin fecha. */
  fecha: string | null;
  /** "Hito cumplido", "Hito planificado", "Kinesiología", "Control médico" o "Nota". */
  tipo: string;
  titulo: string;
  lineas: string[];
  /** Hito cumplido, o sesión de kine con autorizaciones nuevas. */
  destacado: boolean;
  /** Control que viene: se calcula del próximo control, no está guardado. */
  agendado: boolean;
  /** Solo en hitos. */
  notaHito: NotaHito | null;
  /** Lo que abre la tarjeta al tocarla. */
  origen:
    | { tipo: "hito"; hito: Hito }
    | { tipo: "entrada"; entrada: EntradaRecuperacion }
    /** Control agendado: abre un registro nuevo de control en esa fecha. */
    | { tipo: "agendado"; fecha: string };
};

/* Los hitos sin ninguna fecha van al final. */
const SIN_FECHA = "9999-12-31";

/*
  Hitos y entradas en una sola lista, de la fecha más antigua a la más nueva.

  - Un hito ordena por su fecha real si ya se cumplió; si no, por la planificada.
  - Con la misma fecha, van primero los hitos y después las entradas, cada grupo
    en el orden en que llegó: así el orden no salta entre recargas.
  - Una sesión de kine muestra solo lo que autorizó POR PRIMERA VEZ, igual que
    la tarjeta de kinesiología. Si repite algo ya autorizado, es "sin cambios".
  - El próximo control aparece como un ítem propio, "agendado", mientras su
    fecha sea hoy o posterior y no haya un control registrado en esa fecha. No
    se guarda: registrar el control ese día basta para que deje de aparecer.
*/
export function lineaTiempo(
  hitos: Hito[],
  entradas: EntradaRecuperacion[],
  hoy: string,
): ItemLinea[] {
  const numeroDe = new Map<EntradaRecuperacion, number>();
  const nuevasDe = new Map<EntradaRecuperacion, string[]>();
  const yaAutorizadas = new Set<string>();

  cronologico(entradas.filter((e) => e.tipo === "kine")).forEach((sesion, i) => {
    numeroDe.set(sesion, sesion.numero_sesion ?? i + 1);
    const nuevas: string[] = [];
    for (const bruto of sesion.autorizado ?? []) {
      const etiqueta = bruto.trim();
      if (etiqueta && !yaAutorizadas.has(etiqueta)) {
        yaAutorizadas.add(etiqueta);
        nuevas.push(etiqueta);
      }
    }
    nuevasDe.set(sesion, nuevas);
  });

  type ConOrden = { item: ItemLinea; grupoOrden: number; indice: number };

  const deHitos: ConOrden[] = hitos.map((hito, indice) => ({
    grupoOrden: 0,
    indice,
    item: {
      clave: `hito-${hito.id}`,
      grupo: "hito",
      fecha: hito.fecha_real ?? hito.fecha_planificada ?? null,
      tipo: hito.cumplido ? "Hito cumplido" : "Hito planificado",
      titulo: hito.nombre,
      lineas: [],
      destacado: hito.cumplido,
      agendado: false,
      notaHito: notaHito(hito),
      origen: { tipo: "hito", hito },
    },
  }));

  const deEntradas: ConOrden[] = entradas.map((entrada, indice) => {
    const base = {
      clave: `entrada-${entrada.id}`,
      fecha: entrada.fecha,
      agendado: false,
      notaHito: null,
      origen: { tipo: "entrada" as const, entrada },
    };

    if (entrada.tipo === "kine") {
      const nuevas = nuevasDe.get(entrada) ?? [];
      return {
        grupoOrden: 1,
        indice,
        item: {
          ...base,
          grupo: "kine",
          tipo: "Kinesiología",
          titulo: `Sesión ${numeroDe.get(entrada)} · ${nuevas.length ? nuevas.join(", ") : "sin cambios"}`,
          lineas: [],
          destacado: nuevas.length > 0,
        },
      };
    }

    const lineas: string[] = [];
    if (entrada.tipo === "control") {
      if (entrada.indicaciones?.trim()) {
        lineas.push(`Indicaciones: ${entrada.indicaciones.trim()}`);
      }
      if (entrada.proximo_control) {
        lineas.push(`Próximo control: ${minuscula(formatoLargo(entrada.proximo_control))}`);
      }
    }
    if (entrada.nota?.trim()) lineas.push(entrada.nota.trim());

    const esControl = entrada.tipo === "control";
    return {
      grupoOrden: 1,
      indice,
      item: {
        ...base,
        grupo: esControl ? "control" : "nota",
        tipo: esControl ? "Control médico" : "Nota",
        titulo: esControl ? "Control médico" : "Nota",
        lineas,
        destacado: false,
      },
    };
  });

  const deAgenda: ConOrden[] = [];
  const agenda = controlQueAgenda(entradas);
  const fechaAgendada = agenda?.proximo_control;
  if (
    agenda &&
    fechaAgendada &&
    fechaAgendada >= hoy &&
    !entradas.some((e) => e.tipo === "control" && e.fecha === fechaAgendada)
  ) {
    deAgenda.push({
      // Después de las entradas de su misma fecha.
      grupoOrden: 1,
      indice: entradas.length,
      item: {
        clave: `agendado-${fechaAgendada}`,
        grupo: "control",
        fecha: fechaAgendada,
        tipo: "Control agendado",
        titulo: "Control médico",
        lineas: [textoDistancia(diferenciaDias(hoy, fechaAgendada))],
        destacado: false,
        agendado: true,
        notaHito: null,
        // No es un registro: abre uno nuevo de control en su fecha, no el
        // control de otro día que lo agendó.
        origen: { tipo: "agendado", fecha: fechaAgendada },
      },
    });
  }

  return [...deHitos, ...deEntradas, ...deAgenda]
    .sort(
      (a, b) =>
        (a.item.fecha ?? SIN_FECHA).localeCompare(b.item.fecha ?? SIN_FECHA) ||
        a.grupoOrden - b.grupoOrden ||
        a.indice - b.indice,
    )
    .map((x) => x.item);
}

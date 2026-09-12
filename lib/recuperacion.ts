import { diferenciaDias, sumarDias } from "@/lib/fechas";
import type {
  Dia,
  EntradaRecuperacion,
  EstadoTobillo,
  Hinchazon,
} from "@/lib/supabase/tipos";

/*
  Lógica de Recuperación: avance del período, kinesiología, tobillo y
  próximo control. Todo puro y sin JSX.

  Esta pantalla registra una recuperación, no la evalúa: ninguna función
  produce un juicio. "Peor" en el tobillo es un dato más.
*/

const DIAS_FRANJA = 30;

function acotar(n: number): number {
  return Math.min(1, Math.max(0, n));
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
  const controles = cronologico(
    entradas.filter((e) => e.tipo === "control" && e.proximo_control),
  );
  return controles[controles.length - 1]?.proximo_control ?? null;
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

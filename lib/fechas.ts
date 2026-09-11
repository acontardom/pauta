/*
  Fechas de la app.

  Todas las fechas son strings "YYYY-MM-DD" que representan días calendario
  en America/Santiago. Vercel corre en UTC, así que el "hoy" del servidor
  NUNCA se obtiene con new Date().toISOString().slice(0, 10).

  Se usa Intl con timeZone "America/Santiago"; sin librerías de fechas.
*/

const ZONA = "America/Santiago";

const formateadorISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** Descompone "YYYY-MM-DD" en sus partes numéricas. */
function partes(fecha: string): { anio: number; mes: number; dia: number } {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) {
    throw new Error(`Fecha inválida: "${fecha}". Se espera "YYYY-MM-DD".`);
  }
  return {
    anio: Number(coincidencia[1]),
    mes: Number(coincidencia[2]),
    dia: Number(coincidencia[3]),
  };
}

/*
  Los cálculos con fechas se hacen sobre el mediodía UTC del día calendario.
  Así ningún cambio de horario (que ocurre de madrugada) puede correr el día:
  sumar o restar 24 h desde el mediodía siempre cae dentro del día vecino.
*/
function aMediodiaUTC(fecha: string): Date {
  const { anio, mes, dia } = partes(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
}

function deFecha(d: Date): string {
  const anio = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** El día calendario en Chile en un instante dado (por defecto, ahora). */
export function hoyChile(ahora: Date = new Date()): string {
  // "en-CA" formatea como "YYYY-MM-DD".
  return formateadorISO.format(ahora);
}

/** Suma n días calendario (n puede ser negativo). */
export function sumarDias(fecha: string, n: number): string {
  const d = aMediodiaUTC(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return deFecha(d);
}

/** Días calendario entre dos fechas: positivo si "hasta" es posterior. */
export function diferenciaDias(desde: string, hasta: string): number {
  const ms = aMediodiaUTC(hasta).getTime() - aMediodiaUTC(desde).getTime();
  return Math.round(ms / 86_400_000);
}

/** "2026-09-11" → "Viernes 11 de septiembre" */
export function formatoLargo(fecha: string): string {
  const d = aMediodiaUTC(fecha);
  const { mes, dia } = partes(fecha);
  return `${DIAS[d.getUTCDay()]} ${dia} de ${MESES[mes - 1]}`;
}

/** "2026-09-25" → "25 de septiembre de 2026" */
export function formatoLargoConAnio(fecha: string): string {
  const { anio, mes, dia } = partes(fecha);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** "2026-09-11" → "11 sep" */
export function formatoCorto(fecha: string): string {
  const { mes, dia } = partes(fecha);
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

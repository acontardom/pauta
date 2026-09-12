import { GRUPOS, TIEMPOS } from "@/lib/dominio";
import { hoyChile } from "@/lib/fechas";
import type { Porciones } from "@/lib/supabase/tipos";

/*
  Validación de lo que llega desde el cliente antes de escribir en comidas.

  Es una función pura para poder probarla sin base de datos, y corre en el
  servidor: lo que el cliente manda no se confía, ni siquiera siendo un solo
  usuario. Repite a propósito los límites de los check constraints del
  esquema, para fallar con un mensaje entendible en vez de un error de Postgres.
*/

export const MAXIMO_TEXTO = 120;

const PASOS = new Map(GRUPOS.map((g) => [g.clave as string, g.paso]));
const CLAVES_TIEMPO = new Set(TIEMPOS.map((t) => t.clave as string));

export type EntradaComida = {
  fecha: string;
  tiempo: string;
  porciones?: Porciones | null;
  kcal?: number | null;
  texto?: string | null;
};

export type Resultado = { ok: true } | { ok: false; error: string };

function esFechaValida(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

/** Múltiplos en enteros: 0,5 en punto flotante no da residuo exacto. */
function esMultiplo(valor: number, paso: number): boolean {
  return Math.round(valor * 1000) % Math.round(paso * 1000) === 0;
}

export function validarComida(
  entrada: EntradaComida,
  ahora?: Date,
): Resultado {
  const { fecha, tiempo, porciones, kcal, texto } = entrada;

  if (typeof fecha !== "string" || !esFechaValida(fecha)) {
    return { ok: false, error: "La fecha no es válida" };
  }
  // No se registra el futuro: el día se completa el mismo día o después.
  if (fecha > hoyChile(ahora)) {
    return { ok: false, error: "No se puede registrar una fecha futura" };
  }

  if (!CLAVES_TIEMPO.has(tiempo)) {
    return { ok: false, error: "El tiempo de comida no es válido" };
  }

  if (porciones != null) {
    if (typeof porciones !== "object" || Array.isArray(porciones)) {
      return { ok: false, error: "Las porciones no son válidas" };
    }
    for (const [clave, v] of Object.entries(porciones)) {
      const paso = PASOS.get(clave);
      if (paso === undefined) {
        return { ok: false, error: `"${clave}" no es un grupo conocido` };
      }
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return { ok: false, error: `Las porciones de ${clave} no son válidas` };
      }
      if (!esMultiplo(v, paso)) {
        return {
          ok: false,
          error: `Las porciones de ${clave} deben ir de ${String(paso).replace(".", ",")} en ${String(paso).replace(".", ",")}`,
        };
      }
    }
  }

  if (kcal != null) {
    if (typeof kcal !== "number" || !Number.isInteger(kcal) || kcal < 0) {
      return { ok: false, error: "Las kcal deben ser un número entero" };
    }
  }

  if (texto != null) {
    if (typeof texto !== "string") {
      return { ok: false, error: "El texto no es válido" };
    }
    if (texto.length > MAXIMO_TEXTO) {
      return {
        ok: false,
        error: `El texto no puede pasar de ${MAXIMO_TEXTO} caracteres`,
      };
    }
  }

  return { ok: true };
}

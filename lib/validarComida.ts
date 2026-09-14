import { ENTRENAMIENTOS, ESTADOS_TOBILLO, GRUPOS, TIEMPOS } from "@/lib/dominio";
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

/* ------------------------------------------------------------------------- */
/* Validación del resto del día (tabla dias)                                 */
/* ------------------------------------------------------------------------- */

const CLAVES_TOBILLO = new Set<string>(ESTADOS_TOBILLO.map((e) => e.clave));

export type EntradaDia = {
  agua_ml?: number | null;
  kcal_activas?: number | null;
  entrenamiento?: string[] | null;
  entrenamiento_minutos?: number | null;
  estado_tobillo?: string | null;
};

/** Entero >= 0, aceptando null cuando el campo es opcional. */
function enteroNoNegativo(
  valor: unknown,
  nombre: string,
  { nuloOk }: { nuloOk: boolean },
): Resultado {
  if (valor == null) {
    return nuloOk ? { ok: true } : { ok: false, error: `Falta ${nombre}` };
  }
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0) {
    return { ok: false, error: `${nombre} debe ser un número entero` };
  }
  return { ok: true };
}

/*
  `permitidas` son los textos que puede llevar entrenamiento. Sin ella, solo
  las opciones fijas. El servidor pasa además las sesiones de las rutinas
  activas y lo que el día ya tenía guardado: un "Tren superior" antiguo se
  puede conservar al marcar otra cosa, pero no volver a agregar.
*/
export function validarDia(
  fecha: string,
  campos: EntradaDia,
  ahora?: Date,
  permitidas: ReadonlySet<string> = new Set(ENTRENAMIENTOS),
): Resultado {
  if (typeof fecha !== "string" || !esFechaValida(fecha)) {
    return { ok: false, error: "La fecha no es válida" };
  }
  if (fecha > hoyChile(ahora)) {
    return { ok: false, error: "No se puede registrar una fecha futura" };
  }

  // agua_ml es not null en el esquema, con default 0: no acepta null.
  if ("agua_ml" in campos) {
    const r = enteroNoNegativo(campos.agua_ml, "El agua", { nuloOk: false });
    if (!r.ok) return r;
  }
  if ("kcal_activas" in campos) {
    const r = enteroNoNegativo(campos.kcal_activas, "Las calorías activas", {
      nuloOk: true,
    });
    if (!r.ok) return r;
  }
  if ("entrenamiento_minutos" in campos) {
    const r = enteroNoNegativo(campos.entrenamiento_minutos, "Los minutos", {
      nuloOk: true,
    });
    if (!r.ok) return r;
  }

  if ("estado_tobillo" in campos && campos.estado_tobillo != null) {
    if (!CLAVES_TOBILLO.has(campos.estado_tobillo)) {
      return { ok: false, error: "El estado del tobillo no es válido" };
    }
  }

  if ("entrenamiento" in campos && campos.entrenamiento != null) {
    const lista = campos.entrenamiento;
    if (!Array.isArray(lista)) {
      return { ok: false, error: "El entrenamiento no es válido" };
    }
    const vistos = new Set<string>();
    for (const v of lista) {
      if (typeof v !== "string" || !permitidas.has(v)) {
        return { ok: false, error: `"${String(v)}" no es una opción de entrenamiento` };
      }
      if (vistos.has(v)) {
        return { ok: false, error: `"${v}" está repetido` };
      }
      vistos.add(v);
    }
  }

  return { ok: true };
}

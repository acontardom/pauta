import { hoyChile } from "@/lib/fechas";
import type { CambioHito } from "@/lib/supabase/tipos";

/*
  Validación de un hito, y construcción de su historial.

  El historial es ACUMULATIVO: cada cambio de fecha planificada agrega una
  entrada y nunca reemplaza las anteriores. Por eso se arma acá, a partir del
  hito como está en la base, y no con lo que manda el formulario: así un
  guardado no puede borrar cambios que ya estaban registrados.
*/

export const MAXIMO_NOMBRE_HITO = 80;

export type HitoFormulario = {
  nombre: string;
  fecha_planificada: string | null;
  fecha_real: string | null;
  cumplido: boolean;
  /** Solo se usa si cambió la fecha planificada. Puede ir vacío. */
  motivo?: string | null;
};

/** El hito tal como está guardado, para comparar y extender su historial. */
export type HitoAnterior = {
  fecha_planificada: string | null;
  historial: CambioHito[] | null;
};

export type HitoNormalizado = {
  nombre: string;
  fecha_planificada: string | null;
  fecha_real: string | null;
  cumplido: boolean;
  historial: CambioHito[];
};

export type ResultadoHito =
  | { ok: true; hito: HitoNormalizado }
  | { ok: false; error: string };

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

/** Fecha opcional: vacía es null; con contenido tiene que ser válida. Puede ser futura. */
function fechaOpcional(
  v: string | null | undefined,
  nombre: string,
): { ok: true; fecha: string | null } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, fecha: null };
  if (!esFechaValida(v)) return { ok: false, error: `La ${nombre} no es válida` };
  return { ok: true, fecha: v };
}

export function validarHito(
  datos: HitoFormulario,
  anterior: HitoAnterior | null,
  ahora?: Date,
): ResultadoHito {
  const nombre = (datos.nombre ?? "").trim();
  if (!nombre) return { ok: false, error: "El hito necesita un nombre" };
  if (nombre.length > MAXIMO_NOMBRE_HITO) {
    return {
      ok: false,
      error: `El nombre no puede pasar de ${MAXIMO_NOMBRE_HITO} caracteres`,
    };
  }

  const planificada = fechaOpcional(datos.fecha_planificada, "fecha planificada");
  if (!planificada.ok) return planificada;
  const real = fechaOpcional(datos.fecha_real, "fecha real");
  if (!real.ok) return real;

  // El esquema exige cumplido = (fecha_real no es null).
  if (datos.cumplido && real.fecha === null) {
    return { ok: false, error: "Falta la fecha en que se cumplió" };
  }
  if (!datos.cumplido && real.fecha !== null) {
    return { ok: false, error: "Un hito sin cumplir no lleva fecha real" };
  }

  const historial = [...(anterior?.historial ?? [])];

  // Solo cuenta como cambio si ya había una fecha planificada y es otra.
  if (anterior?.fecha_planificada && anterior.fecha_planificada !== planificada.fecha) {
    const motivo = (datos.motivo ?? "").trim();
    historial.push({
      desde: anterior.fecha_planificada,
      hasta: planificada.fecha,
      // Sin motivo, el cambio se registra igual.
      motivo: motivo || null,
      fecha_cambio: hoyChile(ahora),
    });
  }

  return {
    ok: true,
    hito: {
      nombre,
      fecha_planificada: planificada.fecha,
      fecha_real: real.fecha,
      cumplido: datos.cumplido,
      historial,
    },
  };
}

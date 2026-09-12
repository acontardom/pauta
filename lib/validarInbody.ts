import { CAMPOS_INBODY, type ClaveInbody } from "@/lib/dominio";
import { hoyChile } from "@/lib/fechas";
import { parsear } from "@/lib/numeros";

/*
  Validación de una medición InBody.

  Valida Y normaliza: los seis campos llegan como el texto crudo del formulario
  (con la coma del teclado chileno) y salen como número o null.
*/

export type EntradaInbody = {
  fecha: string;
  /** Texto crudo de cada campo. Vacío o ausente es null. */
  valores: Partial<Record<ClaveInbody, string>>;
};

export type InbodyNormalizado = { fecha: string } & Record<
  ClaveInbody,
  number | null
>;

export type ResultadoInbody =
  | { ok: true; medicion: InbodyNormalizado }
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

export function validarInbody(
  entrada: EntradaInbody,
  ahora?: Date,
): ResultadoInbody {
  const { fecha } = entrada;

  if (typeof fecha !== "string" || !esFechaValida(fecha)) {
    return { ok: false, error: "La fecha no es válida" };
  }
  if (fecha > hoyChile(ahora)) {
    return { ok: false, error: "No se puede registrar una fecha futura" };
  }

  const medicion = { fecha } as InbodyNormalizado;
  let alguno = false;

  for (const campo of CAMPOS_INBODY) {
    const texto = (entrada.valores?.[campo.clave] ?? "").trim();

    if (texto === "") {
      medicion[campo.clave] = null;
      continue;
    }

    const n = parsear(texto);
    if (n == null) {
      return { ok: false, error: `${campo.etiqueta}: no es un número` };
    }
    if (n <= 0) {
      return { ok: false, error: `${campo.etiqueta}: debe ser mayor que cero` };
    }
    // Un porcentaje no puede pasar de 100: un 150 es un error de tipeo.
    if (campo.clave === "pct_grasa" && n > 100) {
      return { ok: false, error: "El % de grasa tiene que estar entre 0 y 100" };
    }

    medicion[campo.clave] = n;
    alguno = true;
  }

  // El esquema exige al menos un valor por fila.
  if (!alguno) {
    return { ok: false, error: "Escribe al menos un valor de la medición" };
  }

  return { ok: true, medicion };
}

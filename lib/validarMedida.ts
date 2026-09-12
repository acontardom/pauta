import { hoyChile } from "@/lib/fechas";
import { parsear } from "@/lib/numeros";

/*
  Validación de un registro de peso y cintura.

  Valida Y normaliza: los campos llegan como el texto crudo del formulario
  (donde el teclado chileno escribe coma) y salen como número o null.
*/

export type EntradaMedida = {
  fecha: string;
  /** Texto crudo del campo: acepta coma o punto. */
  peso: string;
  cintura: string;
};

export type MedidaNormalizada = {
  fecha: string;
  peso: number | null;
  cintura: number | null;
};

export type ResultadoMedida =
  | { ok: true; medida: MedidaNormalizada }
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

/** Texto vacío es null; texto con contenido tiene que ser un número > 0. */
function aMedida(
  texto: string,
  nombre: string,
): { ok: true; valor: number | null } | { ok: false; error: string } {
  const limpio = (texto ?? "").trim();
  if (limpio === "") return { ok: true, valor: null };

  const n = parsear(limpio);
  if (n == null) return { ok: false, error: `${nombre} no es un número` };
  if (n <= 0) return { ok: false, error: `${nombre} debe ser mayor que cero` };

  return { ok: true, valor: n };
}

export function validarMedida(
  entrada: EntradaMedida,
  ahora?: Date,
): ResultadoMedida {
  const { fecha } = entrada;

  if (typeof fecha !== "string" || !esFechaValida(fecha)) {
    return { ok: false, error: "La fecha no es válida" };
  }
  if (fecha > hoyChile(ahora)) {
    return { ok: false, error: "No se puede registrar una fecha futura" };
  }

  const peso = aMedida(entrada.peso, "El peso");
  if (!peso.ok) return peso;

  const cintura = aMedida(entrada.cintura, "La cintura");
  if (!cintura.ok) return cintura;

  // El esquema exige al menos uno: se puede guardar solo peso o solo cintura,
  // pero no una fila sin ningún valor.
  if (peso.valor == null && cintura.valor == null) {
    return { ok: false, error: "Escribe al menos el peso o la cintura" };
  }

  return {
    ok: true,
    medida: { fecha, peso: peso.valor, cintura: cintura.valor },
  };
}

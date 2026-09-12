import { hoyChile } from "@/lib/fechas";
import type { Hinchazon, TipoEntrada } from "@/lib/supabase/tipos";

/*
  Validación de una entrada de recuperación.

  Repite a propósito los check constraints del esquema (numero_sesion y
  hinchazon solo en kine; indicaciones y proximo_control solo en control),
  para fallar con un mensaje entendible en vez de un error de Postgres.

  La salida trae TODAS las columnas, con null en las que no corresponden al
  tipo: así un guardado nunca deja un valor viejo de otro tipo en la fila.
*/

export type EntradaFormulario = {
  fecha: string;
  tipo: string;
  numero_sesion?: number | null;
  autorizado?: string[] | null;
  hinchazon?: string | null;
  indicaciones?: string | null;
  proximo_control?: string | null;
  nota?: string | null;
};

export type EntradaNormalizada = {
  fecha: string;
  tipo: TipoEntrada;
  numero_sesion: number | null;
  autorizado: string[];
  hinchazon: Hinchazon | null;
  indicaciones: string | null;
  nota: string | null;
  proximo_control: string | null;
};

export type ResultadoEntrada =
  | { ok: true; entrada: EntradaNormalizada }
  | { ok: false; error: string };

const TIPOS = new Set<string>(["control", "kine", "nota"]);
const HINCHAZONES = new Set<string>(["menos", "igual", "mas"]);

function esFechaValida(v: unknown): v is string {
  if (typeof v !== "string") return false;
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

/** Texto con trim; vacío o ausente es null. */
function textoOpcional(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const limpio = v.trim();
  return limpio.length > 0 ? limpio : null;
}

export function validarEntrada(
  datos: EntradaFormulario,
  ahora?: Date,
): ResultadoEntrada {
  if (!esFechaValida(datos.fecha)) {
    return { ok: false, error: "La fecha no es válida" };
  }
  if (datos.fecha > hoyChile(ahora)) {
    return { ok: false, error: "No se puede registrar una fecha futura" };
  }

  if (!TIPOS.has(datos.tipo)) {
    return { ok: false, error: "El tipo de registro no es válido" };
  }
  const tipo = datos.tipo as TipoEntrada;

  // --- Solo en kinesiología ---
  const numero = datos.numero_sesion ?? null;
  const hinchazon = datos.hinchazon ?? null;

  if (tipo !== "kine" && (numero !== null || hinchazon !== null)) {
    return {
      ok: false,
      error: "El número de sesión y la hinchazón solo van en kinesiología",
    };
  }
  if (numero !== null && (!Number.isInteger(numero) || numero <= 0)) {
    return { ok: false, error: "El número de sesión debe ser un entero mayor que cero" };
  }
  if (hinchazon !== null && !HINCHAZONES.has(hinchazon)) {
    return { ok: false, error: "La hinchazón no es válida" };
  }

  // --- Lo autorizado ---
  const autorizadoBruto = datos.autorizado ?? [];
  if (!Array.isArray(autorizadoBruto)) {
    return { ok: false, error: "Lo autorizado no es válido" };
  }
  const autorizado: string[] = [];
  for (const v of autorizadoBruto) {
    const limpio = typeof v === "string" ? v.trim() : "";
    if (!limpio) {
      return { ok: false, error: "Lo autorizado no puede tener textos vacíos" };
    }
    if (autorizado.includes(limpio)) {
      return { ok: false, error: `"${limpio}" está repetido en lo autorizado` };
    }
    autorizado.push(limpio);
  }
  if (tipo !== "kine" && autorizado.length > 0) {
    return { ok: false, error: "Lo autorizado solo va en kinesiología" };
  }

  // --- Solo en controles ---
  const indicaciones = textoOpcional(datos.indicaciones);
  const proximo = datos.proximo_control ?? null;

  if (tipo !== "control" && (indicaciones !== null || (proximo !== null && proximo !== ""))) {
    return {
      ok: false,
      error: "Las indicaciones y el próximo control solo van en un control médico",
    };
  }
  // El próximo control SÍ puede ser futuro: es lo normal.
  const proximoControl = proximo === "" ? null : proximo;
  if (proximoControl !== null && !esFechaValida(proximoControl)) {
    return { ok: false, error: "La fecha del próximo control no es válida" };
  }

  return {
    ok: true,
    entrada: {
      fecha: datos.fecha,
      tipo,
      numero_sesion: tipo === "kine" ? numero : null,
      autorizado: tipo === "kine" ? autorizado : [],
      hinchazon: tipo === "kine" ? (hinchazon as Hinchazon | null) : null,
      indicaciones: tipo === "control" ? indicaciones : null,
      proximo_control: tipo === "control" ? proximoControl : null,
      nota: textoOpcional(datos.nota),
    },
  };
}

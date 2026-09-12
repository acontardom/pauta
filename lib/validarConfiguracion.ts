import {
  GRUPOS,
  TIEMPOS,
  type ClaveGrupo,
  type ClaveTiempo,
} from "@/lib/dominio";
import { parsear } from "@/lib/numeros";
import type { Configuracion } from "@/lib/supabase/tipos";

/*
  Validación de la configuración.

  Esta fila alimenta a todas las pantallas: las metas mueven los contadores de
  Hoy y la grilla de Semana, los horarios las tarjetas de comida y las fechas
  la barra de Recuperación. Por eso nunca se guarda un valor inválido ni
  incompleto.

  A diferencia de otras validaciones de la app, esta devuelve TODOS los errores
  a la vez, cada uno con su campo: el formulario es largo, y marcar un campo por
  intento obligaría a guardar una y otra vez para descubrir el siguiente.
*/

/** Lo que tiene el formulario: todo como texto crudo, con la coma chilena. */
export type ConfiguracionFormulario = {
  metas_porciones: Record<ClaveGrupo, string>;
  meta_agua_ml: string;
  meta_pct_grasa: string;
  meta_peso: string;
  meta_cintura: string;
  horarios: Record<ClaveTiempo, string>;
  fecha_operacion: string;
  fecha_retorno: string;
};

export type ConfiguracionNormalizada = {
  metas_porciones: Record<ClaveGrupo, number>;
  meta_agua_ml: number;
  meta_pct_grasa: number | null;
  meta_peso: number | null;
  meta_cintura: number | null;
  horarios: Record<ClaveTiempo, string>;
  fecha_operacion: string | null;
  fecha_retorno: string | null;
};

export type ErrorCampo = {
  /** "metas_porciones.aceite", "horarios.cena", "fecha_retorno"… */
  campo: string;
  /** Para el resumen al pie: "Aceite: de 0,5 en 0,5". */
  mensaje: string;
  /** Para mostrar bajo el campo, donde la etiqueta ya se ve: "de 0,5 en 0,5". */
  detalle: string;
};

export type ResultadoConfiguracion =
  | { ok: true; configuracion: ConfiguracionNormalizada }
  | { ok: false; errores: ErrorCampo[] };

/** Lo que entregó la nutricionista. Se muestra si todavía no hay fila guardada. */
export const CONFIGURACION_POR_DEFECTO: ConfiguracionNormalizada = {
  metas_porciones: {
    cereales: 3,
    verduras: 4,
    fruta: 1,
    proteicos: 11,
    lacteos: 2,
    aceite: 1,
    grasas: 1.5,
  },
  meta_agua_ml: 2000,
  meta_pct_grasa: 13,
  meta_peso: 76.5,
  meta_cintura: 88,
  horarios: {
    desayuno: "08:30",
    colacion_am: "11:30",
    almuerzo: "13:30",
    colacion_pm: "17:00",
    cena: "20:00",
  },
  fecha_operacion: "2026-09-04",
  fecha_retorno: "2027-01-01",
};

export type FilaConfiguracion = Pick<
  Configuracion,
  | "metas_porciones"
  | "meta_agua_ml"
  | "meta_pct_grasa"
  | "meta_peso"
  | "meta_cintura"
  | "horarios"
  | "fecha_operacion"
  | "fecha_retorno"
>;

/* Sin redondear: formatear() recortaría a un decimal y el campo mentiría. */
function aTexto(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

/**
 * Los valores iniciales del formulario. Sin fila, los por defecto. Con fila,
 * lo guardado tal cual: un valor que falta queda vacío, no se inventa.
 */
export function formularioDesdeConfiguracion(
  fila: FilaConfiguracion | null,
): ConfiguracionFormulario {
  const base: FilaConfiguracion = fila ?? CONFIGURACION_POR_DEFECTO;
  return {
    metas_porciones: Object.fromEntries(
      GRUPOS.map((g) => [g.clave, aTexto(base.metas_porciones?.[g.clave])]),
    ) as Record<ClaveGrupo, string>,
    meta_agua_ml: aTexto(base.meta_agua_ml),
    meta_pct_grasa: aTexto(base.meta_pct_grasa),
    meta_peso: aTexto(base.meta_peso),
    meta_cintura: aTexto(base.meta_cintura),
    horarios: Object.fromEntries(
      TIEMPOS.map((t) => [t.clave, base.horarios?.[t.clave] ?? ""]),
    ) as Record<ClaveTiempo, string>,
    fecha_operacion: base.fecha_operacion ?? "",
    fecha_retorno: base.fecha_retorno ?? "",
  };
}

function coma(n: number) {
  return String(n).replace(".", ",");
}

/** Múltiplos en enteros: 0,5 en punto flotante no da residuo exacto. */
function esMultiplo(valor: number, paso: number): boolean {
  return Math.round(valor * 1000) % Math.round(paso * 1000) === 0;
}

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

/* input type="time" entrega "HH:MM", y algunos navegadores "HH:MM:SS". */
const HORA = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function validarConfiguracion(
  f: ConfiguracionFormulario,
): ResultadoConfiguracion {
  const errores: ErrorCampo[] = [];
  const fallar = (campo: string, etiqueta: string, detalle: string) =>
    errores.push({ campo, detalle, mensaje: `${etiqueta}: ${detalle}` });

  // --- Metas de porciones: las 7, obligatorias ---
  const metas = {} as Record<ClaveGrupo, number>;
  for (const g of GRUPOS) {
    const campo = `metas_porciones.${g.clave}`;
    const texto = (f.metas_porciones?.[g.clave] ?? "").trim();
    if (!texto) {
      fallar(campo, g.etiqueta, "falta la meta");
      continue;
    }
    const n = parsear(texto);
    if (n === null) {
      fallar(campo, g.etiqueta, "no es un número");
      continue;
    }
    if (n < 0) {
      fallar(campo, g.etiqueta, "no puede ser negativa");
      continue;
    }
    if (!esMultiplo(n, g.paso)) {
      fallar(
        campo,
        g.etiqueta,
        g.paso === 1 ? "solo números enteros" : `de ${coma(g.paso)} en ${coma(g.paso)}`,
      );
      continue;
    }
    metas[g.clave] = n;
  }

  // --- Agua: obligatoria, entero > 0 ---
  let agua = 0;
  {
    const texto = (f.meta_agua_ml ?? "").trim();
    const n = texto ? parsear(texto) : null;
    if (!texto) fallar("meta_agua_ml", "Agua", "falta la meta");
    else if (n === null || !Number.isInteger(n)) {
      fallar("meta_agua_ml", "Agua", "tiene que ser un número entero de ml");
    } else if (n <= 0) fallar("meta_agua_ml", "Agua", "tiene que ser mayor que cero");
    else agua = n;
  }

  // --- Metas objetivo: opcionales ---
  function opcional(
    campo: string,
    etiqueta: string,
    texto: string,
    fueraDeRango: (n: number) => string | null,
  ): number | null {
    const limpio = (texto ?? "").trim();
    if (!limpio) return null;
    const n = parsear(limpio);
    if (n === null) {
      fallar(campo, etiqueta, "no es un número");
      return null;
    }
    const problema = fueraDeRango(n);
    if (problema) {
      fallar(campo, etiqueta, problema);
      return null;
    }
    return n;
  }

  const pctGrasa = opcional("meta_pct_grasa", "% de grasa", f.meta_pct_grasa, (n) =>
    n < 0 || n > 100 ? "tiene que estar entre 0 y 100" : null,
  );
  const peso = opcional("meta_peso", "Peso", f.meta_peso, (n) =>
    n <= 0 ? "tiene que ser mayor que cero" : null,
  );
  const cintura = opcional("meta_cintura", "Cintura", f.meta_cintura, (n) =>
    n <= 0 ? "tiene que ser mayor que cero" : null,
  );

  // --- Horarios: los 5, obligatorios ---
  const horarios = {} as Record<ClaveTiempo, string>;
  for (const t of TIEMPOS) {
    const campo = `horarios.${t.clave}`;
    const texto = (f.horarios?.[t.clave] ?? "").trim();
    const m = HORA.exec(texto);
    if (!texto) fallar(campo, t.etiqueta, "falta el horario");
    else if (!m) fallar(campo, t.etiqueta, "el horario no es válido");
    // Siempre "HH:MM": es lo que exige horarios_validos() en la base.
    else horarios[t.clave] = `${m[1]}:${m[2]}`;
  }

  // --- Fechas: opcionales, y el retorno después de la operación ---
  const operacion = (f.fecha_operacion ?? "").trim() || null;
  const retorno = (f.fecha_retorno ?? "").trim() || null;
  const operacionValida = operacion === null || esFechaValida(operacion);
  const retornoValido = retorno === null || esFechaValida(retorno);
  if (!operacionValida) {
    fallar("fecha_operacion", "Fecha de operación", "no es una fecha válida");
  }
  if (!retornoValido) {
    fallar("fecha_retorno", "Fecha de retorno", "no es una fecha válida");
  }
  if (operacion && retorno && operacionValida && retornoValido && retorno <= operacion) {
    fallar(
      "fecha_retorno",
      "Fecha de retorno",
      "tiene que ser posterior a la de operación",
    );
  }

  if (errores.length > 0) return { ok: false, errores };

  return {
    ok: true,
    configuracion: {
      metas_porciones: metas,
      meta_agua_ml: agua,
      meta_pct_grasa: pctGrasa,
      meta_peso: peso,
      meta_cintura: cintura,
      horarios,
      fecha_operacion: operacion,
      fecha_retorno: retorno,
    },
  };
}

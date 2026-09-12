import { GRUPOS, TIEMPOS } from "@/lib/dominio";
import { limpiarPorciones } from "@/lib/porciones";
import type { Porciones } from "@/lib/supabase/tipos";

/*
  Validación de un menú.

  Valida Y normaliza en la misma función: los ingredientes llegan como el texto
  crudo del textarea y salen como arreglo, el nombre sale con trim y una
  observación vacía sale como null. Así lo que se guarda es exactamente lo que
  se validó, sin un segundo paso donde algo pueda colarse sin revisar.
*/

export const MAXIMO_NOMBRE = 80;

const PASOS = new Map(GRUPOS.map((g) => [g.clave as string, g.paso]));
const CLAVES_TIEMPO = new Set(TIEMPOS.map((t) => t.clave as string));

export type EntradaMenu = {
  nombre: string;
  tiempo: string;
  /** Texto crudo del textarea: una línea por ingrediente. */
  ingredientes: string;
  observacion: string;
  porciones: Porciones;
  kcal: number | null;
};

export type MenuNormalizado = {
  nombre: string;
  tiempo: string;
  ingredientes: string[];
  observacion: string | null;
  porciones: Porciones;
  kcal: number | null;
};

export type ResultadoMenu =
  | { ok: true; menu: MenuNormalizado }
  | { ok: false; error: string };

/** Múltiplos en enteros: 0,5 en punto flotante no da residuo exacto. */
function esMultiplo(valor: number, paso: number): boolean {
  return Math.round(valor * 1000) % Math.round(paso * 1000) === 0;
}

function coma(n: number) {
  return String(n).replace(".", ",");
}

export function validarMenu(entrada: EntradaMenu): ResultadoMenu {
  const nombre = (entrada.nombre ?? "").trim();

  if (nombre.length === 0) {
    return { ok: false, error: "El menú necesita un nombre" };
  }
  if (nombre.length > MAXIMO_NOMBRE) {
    return {
      ok: false,
      error: `El nombre no puede pasar de ${MAXIMO_NOMBRE} caracteres`,
    };
  }

  if (!CLAVES_TIEMPO.has(entrada.tiempo)) {
    return { ok: false, error: "El tiempo de comida no es válido" };
  }

  // Una línea por ingrediente; las vacías se descartan.
  const ingredientes = (entrada.ingredientes ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);

  const observacionLimpia = (entrada.observacion ?? "").trim();
  const observacion = observacionLimpia.length > 0 ? observacionLimpia : null;

  const porcionesCrudas = entrada.porciones ?? {};
  if (typeof porcionesCrudas !== "object" || Array.isArray(porcionesCrudas)) {
    return { ok: false, error: "Las porciones no son válidas" };
  }
  for (const [clave, v] of Object.entries(porcionesCrudas)) {
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
        error: `Las porciones de ${clave} deben ir de ${coma(paso)} en ${coma(paso)}`,
      };
    }
  }
  // limpiarPorciones va DESPUÉS de validar: un 0,3 en aceite tiene que fallar,
  // no desaparecer sin aviso por no ser cero.
  const porciones = limpiarPorciones(porcionesCrudas);

  const kcal = entrada.kcal;
  if (kcal != null) {
    if (typeof kcal !== "number" || !Number.isInteger(kcal) || kcal < 0) {
      return { ok: false, error: "Las kcal deben ser un número entero" };
    }
  }

  return {
    ok: true,
    menu: {
      nombre,
      tiempo: entrada.tiempo,
      ingredientes,
      observacion,
      porciones,
      kcal: kcal ?? null,
    },
  };
}

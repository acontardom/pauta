import { GRUPOS, type ClaveGrupo } from "@/lib/dominio";
import { formatear } from "@/lib/numeros";
import type { Porciones } from "@/lib/supabase/tipos";

/*
  Operaciones sobre un objeto de porciones.

  Las claves ausentes valen 0, y un 0 explícito es lo mismo que la ausencia:
  por eso limpiarPorciones() se usa antes de guardar, para que la base no
  acumule ceros que no dicen nada.
*/

const PASOS = new Map(GRUPOS.map((g) => [g.clave, g.paso]));

/**
 * Texto de una comida, en el orden de GRUPOS y sin los ceros.
 * "1 cereales · 2 verduras · 4 proteicos · 0,5 aceite · 600 kcal"
 */
export function textoPorciones(
  porciones: Porciones | null | undefined,
  kcal?: number | null,
): string {
  const partes = GRUPOS.filter((g) => {
    const v = porciones?.[g.clave];
    return typeof v === "number" && v > 0;
  }).map((g) => `${formatear(porciones![g.clave])} ${g.etiqueta.toLowerCase()}`);

  if (kcal != null) partes.push(`${kcal} kcal`);
  return partes.join(" · ");
}

/** Suma o resta un paso, sin bajar de 0. */
export function ajustarPorcion(
  valor: number,
  paso: number,
  direccion: 1 | -1,
): number {
  const bruto = valor + paso * direccion;
  // Se redondea al paso para que 0,5 + 0,5 no deje 1.0000000000000002.
  const redondeado = Math.round(bruto / paso) * paso;
  return Math.max(0, Math.round(redondeado * 100) / 100);
}

/** Quita los ceros y las claves que no son grupos conocidos. */
export function limpiarPorciones(
  porciones: Porciones | null | undefined,
): Porciones {
  const limpio: Porciones = {};
  if (!porciones) return limpio;

  for (const g of GRUPOS) {
    const v = porciones[g.clave];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      limpio[g.clave] = v;
    }
  }
  return limpio;
}

/** true si no hay ninguna porción marcada. */
export function porcionesVacias(
  porciones: Porciones | null | undefined,
): boolean {
  return Object.keys(limpiarPorciones(porciones)).length === 0;
}

/** El paso de un grupo: 0,5 en aceite y grasas, 1 en el resto. */
export function pasoDe(grupo: ClaveGrupo): number {
  return PASOS.get(grupo) ?? 1;
}

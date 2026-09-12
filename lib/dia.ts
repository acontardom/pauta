import { GRUPOS } from "@/lib/dominio";
import type { Comida, Porciones } from "@/lib/supabase/tipos";

/*
  Cálculos del día a partir de sus comidas.

  Las comidas ESTIMADAS entran en los totales igual que las completas: comer
  fuera no es una falla, y sus porciones son parte de lo que se comió. Lo que
  cambia es cómo se presentan, no cómo se suman.
*/

export type EstadoComida = "completa" | "estimada" | "pendiente";

export type TotalesDia = {
  porciones: Porciones;
  kcal: number;
  /** Cuántas comidas aportaron kcal: si son 0, el contador muestra "—". */
  comidasConKcal: number;
};

export function totalesDia(comidas: Comida[]): TotalesDia {
  const porciones: Porciones = {};
  let kcal = 0;
  let comidasConKcal = 0;

  for (const comida of comidas) {
    for (const g of GRUPOS) {
      const v = comida.porciones?.[g.clave];
      if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
        // Se acumula redondeando a dos decimales: los pasos son de 0,5.
        porciones[g.clave] = Math.round(((porciones[g.clave] ?? 0) + v) * 100) / 100;
      }
    }
    if (comida.kcal != null) {
      kcal += comida.kcal;
      comidasConKcal++;
    }
  }

  return { porciones, kcal, comidasConKcal };
}

/** Una comida sin fila está pendiente; el modo "fuera" es la estimada. */
export function estadoComida(comida: Comida | undefined | null): EstadoComida {
  if (!comida) return "pendiente";
  return comida.modo === "fuera" ? "estimada" : "completa";
}

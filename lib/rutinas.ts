import { etiquetaSesion } from "@/lib/dominio";
import type { Ejercicio, Rutina } from "@/lib/supabase/tipos";

/*
  Lógica de las rutinas de entrenamiento, toda pura.

  Las rutinas se leen, no se marcan: en Hoy se marca la sesión ("Sesión A") y
  la hoja de rutina es solo para seguir la lista mientras se entrena.
*/

export type OpcionEntrenamiento = {
  /** Lo que se guarda en dias.entrenamiento: "Sesión A". */
  etiqueta: string;
  /** La segunda línea del chip: "Empuje + core". */
  nombre: string;
};

/*
  Las opciones de la tarjeta de entrenamiento: una por rutina activa, en el
  orden en que llegan (ya ordenadas por `orden`). Si dos rutinas activas
  comparten clave, la etiqueta aparece una sola vez, con el nombre de la primera.
*/
export function opcionesEntrenamiento(
  rutinas: Pick<Rutina, "clave" | "nombre">[],
): OpcionEntrenamiento[] {
  const vistas = new Set<string>();
  const opciones: OpcionEntrenamiento[] = [];
  for (const r of rutinas) {
    const etiqueta = etiquetaSesion(r.clave);
    if (vistas.has(etiqueta)) continue;
    vistas.add(etiqueta);
    opciones.push({ etiqueta, nombre: r.nombre });
  }
  return opciones;
}

/*
  La pestaña con que abre la hoja: la sesión marcada ese día. Si están
  marcadas varias o ninguna, la primera rutina.
*/
export function rutinaInicial(
  rutinas: Pick<Rutina, "id" | "clave">[],
  entrenamiento: string[],
): string | null {
  const marcadas = rutinas.filter((r) =>
    entrenamiento.includes(etiquetaSesion(r.clave)),
  );
  if (marcadas.length === 1) return marcadas[0].id;
  return rutinas[0]?.id ?? null;
}

/** "A · Empuje + core" */
export function etiquetaPestana(rutina: Pick<Rutina, "clave" | "nombre">): string {
  return `${rutina.clave} · ${rutina.nombre}`;
}

/** Por `orden`; los que no lo tienen van al final, en el orden del arreglo. */
export function ejerciciosEnOrden(ejercicios: Ejercicio[]): Ejercicio[] {
  return [...ejercicios].sort(
    (a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity),
  );
}

export type CeldaEjercicio = { etiqueta: string; valor: string };

/*
  Las tres celdas de un ejercicio: series, reps y descanso. Las reps van tal
  como están ("8-12", "10 por lado"); sin descanso, "—".
*/
export function celdasEjercicio(
  e: Pick<Ejercicio, "series" | "reps" | "descanso_seg">,
): CeldaEjercicio[] {
  return [
    { etiqueta: "Series", valor: String(e.series) },
    { etiqueta: "Reps", valor: e.reps.trim() },
    {
      etiqueta: "Descanso",
      valor: e.descanso_seg != null ? `${e.descanso_seg} s` : "—",
    },
  ];
}

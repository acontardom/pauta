import { ENTRENAMIENTOS, etiquetaSesion } from "@/lib/dominio";
import type { Ejercicio, Rutina } from "@/lib/supabase/tipos";

/*
  Lógica de las rutinas de entrenamiento, toda pura.

  Las rutinas se leen, no se marcan: en Hoy se marca la sesión ("Sesión A") y
  la hoja de rutina es solo para seguir la lista mientras se entrena.
*/

/*
  Las opciones de la tarjeta de entrenamiento, en orden: una por rutina activa
  (ya ordenadas por `orden`) y después las fijas. Si dos rutinas activas
  comparten clave, la etiqueta aparece una sola vez.
*/
export function opcionesEntrenamiento(rutinas: Pick<Rutina, "clave">[]): string[] {
  return [
    ...new Set([...rutinas.map((r) => etiquetaSesion(r.clave)), ...ENTRENAMIENTOS]),
  ];
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

/*
  "4 series · 8-12 reps · 90 s". Las reps llevan "reps" solo si son un número
  o un rango: "10 por lado" o "30 seg por lado" ya se explican solas.
*/
export function textoEjercicio(
  e: Pick<Ejercicio, "series" | "reps" | "descanso_seg">,
): string {
  const partes = [`${e.series} ${e.series === 1 ? "serie" : "series"}`];
  const reps = e.reps.trim();
  if (/^\d+(\s*[-–]\s*\d+)?$/.test(reps)) {
    partes.push(`${reps} ${reps === "1" ? "rep" : "reps"}`);
  } else {
    partes.push(reps);
  }
  if (e.descanso_seg != null) partes.push(`${e.descanso_seg} s`);
  return partes.join(" · ");
}

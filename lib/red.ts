/*
  Fallos al llamar una Server Action desde el cliente.

  Una acción que no llega al servidor no devuelve { ok: false }: la promesa se
  RECHAZA. Sin atraparla, el rechazo sube hasta error.tsx y la pantalla se
  cambia entera por un error. Cada llamada la envuelve para convertirla en un
  aviso normal, como cualquier otro fallo de guardado.
*/

export const AVISO_SIN_CONEXION =
  "Sin conexión. Vuelve a intentarlo cuando tengas señal.";

export const AVISO_FALLO = "No se pudo guardar. Intenta de nuevo.";

/**
 * Sin red, fetch rechaza con un TypeError ("Load failed" en Safari, "Failed
 * to fetch" en Chrome). navigator.onLine cubre el modo avión aunque el error
 * venga con otra forma.
 */
export function esFalloDeRed(error: unknown, enLinea: boolean): boolean {
  return !enLinea || error instanceof TypeError;
}

/** El aviso que corresponde a una acción que rechazó. */
export function avisoDeFallo(error: unknown): string {
  // Solo un false explícito cuenta: fuera del navegador onLine no existe.
  const enLinea =
    typeof navigator === "undefined" || navigator.onLine !== false;
  return esFalloDeRed(error, enLinea) ? AVISO_SIN_CONEXION : AVISO_FALLO;
}

/** Llama la acción y, si rechaza, devuelve el fallo con la forma de siempre. */
export async function llamarAccion<T>(
  accion: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await accion();
  } catch (e) {
    return { ok: false, error: avisoDeFallo(e) };
  }
}

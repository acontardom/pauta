/*
  Validación de una pregunta para el próximo control.
  Valida y normaliza: el texto sale con trim.
*/

export const MAXIMO_PREGUNTA = 200;

export type ResultadoPregunta =
  | { ok: true; texto: string }
  | { ok: false; error: string };

export function validarPregunta(texto: unknown): ResultadoPregunta {
  if (typeof texto !== "string") {
    return { ok: false, error: "La pregunta no es válida" };
  }
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return { ok: false, error: "Escribe la pregunta" };
  }
  if (limpio.length > MAXIMO_PREGUNTA) {
    return {
      ok: false,
      error: `La pregunta no puede pasar de ${MAXIMO_PREGUNTA} caracteres`,
    };
  }
  return { ok: true, texto: limpio };
}

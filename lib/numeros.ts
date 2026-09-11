/*
  Números de la app, en formato chileno: coma decimal y máximo un decimal.
  Toda la UI formatea y parsea desde aquí.
*/

/** Formatea para mostrar: coma decimal, 1 decimal como máximo, "—" si no hay valor. */
export function formatear(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const redondeado = Math.round(n * 10) / 10;
  return Number.isInteger(redondeado)
    ? String(redondeado)
    : String(redondeado).replace(".", ",");
}

/** Parsea lo que escribe el usuario: acepta coma o punto. null si no es un número. */
export function parsear(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  // Se acepta solo un número decimal simple, con signo opcional.
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

import { createHash, timingSafeEqual } from "node:crypto";

/*
  Autenticación del endpoint MCP.

  Claude reserva el encabezado Authorization para su propio token de OAuth, así
  que el token va en "access-key", plano y sin prefijo. Como alternativa, por
  si algún día el conector deja usarlo, también se acepta
  "Authorization: Bearer <token>".

  Si viene access-key, decide solo access-key: el Authorization de esa misma
  petición puede ser el token de OAuth de Claude, que no es el nuestro.

  El token esperado vive en MCP_TOKEN, una variable solo de servidor (nunca con
  prefijo NEXT_PUBLIC_). Un token corto se trata como servidor sin configurar:
  es preferible rechazar todo a aceptar algo adivinable.
*/

export const LARGO_MINIMO_TOKEN = 32;

export type ResultadoToken = "valido" | "ausente" | "invalido" | "sin-configurar";

export type EncabezadosToken = {
  /** Encabezado access-key: el token plano. */
  accessKey: string | null;
  /** Encabezado Authorization: "Bearer <token>". */
  autorizacion: string | null;
};

type TokenRecibido = { tipo: "ausente" } | { tipo: "malformado" } | { tipo: "token"; valor: string };

function tokenRecibido({ accessKey, autorizacion }: EncabezadosToken): TokenRecibido {
  if (accessKey !== null) {
    const valor = accessKey.trim();
    if (valor === "") return { tipo: "ausente" };
    // Plano: un espacio adentro (por ejemplo "Bearer xyz") no es un token.
    return /\s/.test(valor) ? { tipo: "malformado" } : { tipo: "token", valor };
  }

  if (!autorizacion?.trim()) return { tipo: "ausente" };
  const m = /^Bearer\s+(\S+)\s*$/i.exec(autorizacion.trim());
  return m ? { tipo: "token", valor: m[1] } : { tipo: "malformado" };
}

export function revisarToken(
  encabezados: EncabezadosToken,
  esperado: string | undefined,
): ResultadoToken {
  if (!esperado || esperado.length < LARGO_MINIMO_TOKEN) return "sin-configurar";

  const recibido = tokenRecibido(encabezados);
  if (recibido.tipo === "ausente") return "ausente";
  if (recibido.tipo === "malformado") return "invalido";

  // Se comparan los hashes: timingSafeEqual exige el mismo largo, y así el
  // tiempo de la comparación no revela cuántos caracteres coinciden.
  const a = createHash("sha256").update(recibido.valor).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b) ? "valido" : "invalido";
}

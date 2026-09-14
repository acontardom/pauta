import { createMcpHandler } from "mcp-handler";
import { OPCIONES_SERVIDOR, registrarHerramientas } from "@/lib/mcp/servidor";
import { revisarToken } from "@/lib/mcp/token";

/*
  Endpoint MCP (Streamable HTTP) para usar la pauta desde un chat con Claude.

  Queda fuera del matcher de proxy.ts: no usa las cookies de la app. Cada
  petición trae el token en el encabezado "access-key" (o, como alternativa,
  "Authorization: Bearer <token>"); sin token válido se rechaza antes de llegar
  al servidor MCP. Los datos se leen y escriben con la sesión del usuario
  (lib/mcp/sesion.ts), así que RLS aplica como en la app.
*/

const manejador = createMcpHandler(registrarHerramientas, OPCIONES_SERVIDOR);

/*
  Sin WWW-Authenticate a propósito: un desafío Bearer le dice a Claude que
  pruebe OAuth, y este servidor no lo usa. El mensaje del cuerpo dice qué falta.
*/
function rechazar(estado: 401 | 503, mensaje: string): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: mensaje }, id: null },
    { status: estado },
  );
}

async function atender(request: Request): Promise<Response> {
  const resultado = revisarToken(
    {
      accessKey: request.headers.get("access-key"),
      autorizacion: request.headers.get("authorization"),
    },
    process.env.MCP_TOKEN,
  );

  switch (resultado) {
    case "valido":
      return manejador(request);
    case "sin-configurar":
      return rechazar(503, "El servidor MCP no está configurado: falta MCP_TOKEN en el servidor.");
    case "ausente":
      return rechazar(401, "Falta el token: envíalo en el encabezado access-key.");
    case "invalido":
      return rechazar(401, "Token inválido.");
  }
}

export { atender as GET, atender as POST, atender as DELETE };

import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { McpHandlerOptions } from "mcp-handler";
import { z } from "zod";
import { TIEMPOS, type ClaveGrupo, type ClaveTiempo } from "@/lib/dominio";
import {
  MAXIMO_ML_POR_REGISTRO,
  listarMenus,
  obtenerDia,
  registrarAgua,
  registrarComida,
  resumenSemana,
  type Repositorio,
  type Resultado,
} from "./pauta";
import { crearRepositorio } from "./repositorio";
import { sesionMcp } from "./sesion";

/*
  Las cinco herramientas del servidor MCP: esquemas, descripciones y anotaciones.
  La lógica vive en pauta.ts; acá solo se declara cómo las ve Claude.

  Las dos que escriben (registrar_comida y registrar_agua) lo dicen al inicio
  de su descripción y piden confirmación explícita, y van con
  readOnlyHint: false para que Claude pida aprobación antes de usarlas. Las de
  lectura van con readOnlyHint: true.
*/

export const OPCIONES_SERVIDOR: McpHandlerOptions = {
  serverInfo: { name: "pauta", version: "1.0.0" },
  instructions:
    "Datos personales de una pauta nutricional por porciones (nunca por calorías) " +
    "de un solo usuario, en español de Chile. Las fechas son días calendario de " +
    "Chile en formato AAAA-MM-DD. registrar_comida y registrar_agua escriben en la " +
    "base de datos: antes de usarlas, muestra qué se va a registrar y espera la " +
    "confirmación explícita del usuario. Comer fuera no es una falta: se registra " +
    "como estimada y suma igual.",
};

const TIEMPO = z
  .enum(TIEMPOS.map((t) => t.clave) as [ClaveTiempo, ...ClaveTiempo[]])
  .describe("Tiempo de comida: desayuno, colacion_am, almuerzo, colacion_pm o cena.");

const FECHA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
  .describe("Fecha AAAA-MM-DD (día calendario en Chile). Si se omite, hoy. No admite fechas futuras.")
  .optional();

function porcion(grupo: ClaveGrupo, paso: string) {
  return z
    .number()
    .min(0)
    .describe(`Porciones de ${grupo}, de ${paso} en ${paso}.`)
    .optional();
}

const PORCIONES = z
  .object({
    cereales: porcion("cereales", "1"),
    verduras: porcion("verduras", "1"),
    fruta: porcion("fruta", "1"),
    proteicos: porcion("proteicos", "1"),
    lacteos: porcion("lacteos", "1"),
    aceite: porcion("aceite", "0,5"),
    grasas: porcion("grasas", "0,5"),
  })
  .strict()
  .describe("Porciones por grupo. Los grupos que no se envían valen 0.");

/** Abre la sesión del usuario, corre la herramienta y traduce el resultado. */
async function ejecutar(
  herramienta: (repo: Repositorio) => Promise<Resultado>,
): Promise<CallToolResult> {
  try {
    const resultado = await herramienta(crearRepositorio(await sesionMcp()));
    return resultado.ok
      ? { content: [{ type: "text", text: resultado.texto }] }
      : { content: [{ type: "text", text: resultado.error }], isError: true };
  } catch (e) {
    // Los errores de sesión y del repositorio ya traen un mensaje propio y
    // claro; no se reenvía el detalle de Supabase.
    const mensaje = e instanceof Error ? e.message : "Error inesperado.";
    return { content: [{ type: "text", text: mensaje }], isError: true };
  }
}

export function registrarHerramientas(server: McpServer) {
  server.registerTool(
    "obtener_dia",
    {
      title: "Ver un día",
      description:
        "Solo lectura. Devuelve un día de la pauta: las comidas registradas en cada " +
        "tiempo (modo y porciones), el total por grupo, lo que falta para cada meta " +
        "diaria, el agua con su meta, las calorías activas, el entrenamiento, el " +
        "estado del tobillo y si el día está cerrado. Úsala antes de registrar para " +
        "saber qué hay.",
      inputSchema: z.object({ fecha: FECHA }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ fecha }) => ejecutar((repo) => obtenerDia(repo, { fecha })),
  );

  server.registerTool(
    "listar_menus",
    {
      title: "Listar menús",
      description:
        "Solo lectura. Lista los menús guardados, agrupados por tiempo, con nombre, " +
        "ingredientes, observación, porciones y kcal. Incluye el id de cada menú, " +
        'que registrar_comida necesita en modo "menu".',
      inputSchema: z.object({ tiempo: TIEMPO.optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ tiempo }) => ejecutar((repo) => listarMenus(repo, { tiempo })),
  );

  server.registerTool(
    "registrar_comida",
    {
      title: "Registrar comida",
      description:
        "ESCRIBE EN LA BASE DE DATOS. Antes de llamarla, muestra al usuario " +
        "exactamente qué vas a registrar (fecha, tiempo, modo y el menú o las " +
        "porciones) y espera su confirmación explícita. Nunca la llames sin esa " +
        "confirmación. " +
        "Registra la comida de un tiempo en un día. Si ese tiempo ya tenía una " +
        "comida, la REEMPLAZA: revísalo antes con obtener_dia y avísalo al pedir " +
        "confirmación. " +
        'Modo "menu": menu_id obligatorio (sale de listar_menus); las porciones y ' +
        'las kcal se copian del menú guardado. Modo "manual": porciones ' +
        'obligatorias, al menos una. Modo "fuera" (comí fuera, queda como ' +
        "estimada): texto_libre y porciones estimadas, ambos opcionales. " +
        'kcal es opcional y solo sirve en "manual" y "fuera": envíalo cuando se ' +
        "conozcan o se puedan estimar las calorías de lo que se comió (el usuario " +
        "las dice, vienen en una etiqueta o las estimas y el usuario las confirma); si no, " +
        'omítelo y la comida queda sin kcal. En "menu" se ignora. Devuelve lo ' +
        "registrado y el nuevo " +
        "acumulado del día: porciones por grupo, kcal de las comidas y agua.",
      inputSchema: z.object({
        fecha: FECHA,
        tiempo: TIEMPO,
        modo: z
          .enum(["menu", "manual", "fuera"])
          .describe("menu: desde un menú guardado · manual: porciones marcadas · fuera: comí fuera (estimada)."),
        menu_id: z.string().describe('Id del menú, solo en modo "menu".').optional(),
        porciones: PORCIONES.optional(),
        texto_libre: z
          .string()
          .max(120)
          .describe('Qué se comió, solo en modo "fuera". Por defecto "Comí fuera".')
          .optional(),
        kcal: z
          .number()
          .int()
          .min(0)
          .describe(
            'Calorías aportadas por la comida, en modo "manual" o "fuera". Opcional. ' +
              'En modo "menu" se ignora: se usan las del menú.',
          )
          .optional(),
      }),
      annotations: {
        readOnlyHint: false,
        // Puede reemplazar una comida ya registrada.
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (entrada) => ejecutar((repo) => registrarComida(repo, entrada)),
  );

  server.registerTool(
    "registrar_agua",
    {
      title: "Registrar agua",
      description:
        "ESCRIBE EN LA BASE DE DATOS. Antes de llamarla, muestra al usuario " +
        "cuántos ml vas a sumar y a qué día, y espera su confirmación explícita. " +
        "Nunca la llames sin esa confirmación. " +
        "Suma ml al agua del día (no reemplaza el total). Devuelve el total de agua " +
        "del día y cuánto falta para la meta.",
      inputSchema: z.object({
        fecha: FECHA,
        ml: z
          .number()
          .int()
          .positive()
          .max(MAXIMO_ML_POR_REGISTRO)
          .describe("Mililitros a sumar. Un vaso son unos 250 ml."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        // Llamarla dos veces suma dos veces.
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    ({ fecha, ml }) => ejecutar((repo) => registrarAgua(repo, { fecha, ml })),
  );

  server.registerTool(
    "obtener_resumen_semana",
    {
      title: "Resumen de la semana",
      description:
        "Solo lectura. Resume 7 días: días registrados (cerrados) sobre 7, las metas " +
        "de porciones cumplidas y el agua de cada día, y los promedios de agua y " +
        "calorías activas con cuántos días con dato se calcularon. Sin fecha_inicio mira los 7 " +
        "días que terminan hoy, igual que la pantalla Semana de la app (no es de " +
        "lunes a domingo).",
      inputSchema: z.object({
        fecha_inicio: FECHA.describe(
          "Primer día de los 7, AAAA-MM-DD. Si se omite, hoy menos 6 días.",
        ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ fecha_inicio }) => ejecutar((repo) => resumenSemana(repo, { fecha_inicio })),
  );
}

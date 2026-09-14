import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TABLAS, validarSemilla } from "./validar";

/*
  Carga la semilla en la base.

  Tres garantías, en este orden:
  1. Valida el archivo COMPLETO antes de escribir. Un solo error y no inserta nada.
  2. Solo inserta lo que falta, comparando por clave natural. Nunca update ni delete.
  3. Se puede correr las veces que sea: la segunda vez inserta 0 filas.

  Usa la clave secreta de Supabase, que salta RLS, así que corre solo en local
  y nunca se sube a Vercel. La clave no se imprime en ninguna parte.

  Uso:
    npm run semilla:revisar   muestra lo que haría, sin escribir
    npm run semilla           inserta
*/

const ARCHIVO = resolve(process.cwd(), "supabase/semilla/datos.json");
const REVISAR = process.argv.includes("--revisar");

type Fila = Record<string, unknown>;

/** Una tabla del archivo y cómo reconocer si una fila ya está en la base. */
type Plan = {
  tabla: (typeof TABLAS)[number];
  /** Clave natural: dos filas con la misma clave son la misma fila. */
  clave: (f: Fila) => string;
  /** Columnas a leer de la base para calcular la clave. */
  columnas: string;
  /** Ajustes al insertar (campos derivados que no vienen en el archivo). */
  alInsertar?: (f: Fila) => Fila;
};

/*
  Las claves naturales juntan varios campos. El separador es el carácter de
  control "unit separator" (31), que no puede aparecer en un nombre ni en una
  fecha: con un espacio, ("desayuno Pan", "con huevos") y ("desayuno", "Pan
  con huevos") darían la misma clave.
*/
const SEP = String.fromCharCode(31);
const k = (...partes: unknown[]) =>
  partes.map((p) => (p === null || p === undefined ? "" : String(p))).join(SEP);

const PLANES: Plan[] = [
  {
    tabla: "configuracion",
    // Una sola fila por usuario: si ya hay una, no se inserta ninguna.
    clave: () => "unica",
    columnas: "id",
  },
  {
    tabla: "hitos",
    clave: (f) => k(f.clave),
    columnas: "clave",
    alInsertar: (f) => ({
      ...f,
      fijo: true,
      cumplido: f.fecha_real != null,
      historial: [],
    }),
  },
  {
    tabla: "menus",
    clave: (f) => k(f.tiempo, f.nombre),
    columnas: "tiempo, nombre",
  },
  {
    tabla: "alimentos",
    clave: (f) => k(f.grupo, f.nombre),
    columnas: "grupo, nombre",
  },
  { tabla: "medidas", clave: (f) => k(f.fecha), columnas: "fecha" },
  { tabla: "inbody", clave: (f) => k(f.fecha), columnas: "fecha" },
  {
    tabla: "entradas_recuperacion",
    clave: (f) => k(f.fecha, f.tipo, f.numero_sesion),
    columnas: "fecha, tipo, numero_sesion",
  },
  {
    tabla: "preguntas_control",
    clave: (f) => k(f.texto),
    columnas: "texto",
  },
];

/** La salida del script: lo que ve quien lo corre, no un log de depuración. */
function imprimir(texto = "") {
  process.stdout.write(`${texto}\n`);
}

function morir(mensaje: string): never {
  console.error(`\n  ${mensaje}\n`);
  process.exit(1);
}

/** Busca el usuario autorizado entre los de auth, paginando. */
async function buscarUsuario(supabase: SupabaseClient, correo: string) {
  const buscado = correo.trim().toLowerCase();
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: pagina,
      perPage: 200,
    });
    if (error) morir(`No se pudo listar los usuarios: ${error.message}`);

    const encontrado = data.users.find(
      (u) => u.email?.trim().toLowerCase() === buscado,
    );
    if (encontrado) return encontrado;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Las filas del archivo para una tabla, siempre como arreglo. */
function filasDelArchivo(datos: Record<string, unknown>, tabla: string): Fila[] {
  const v = datos[tabla];
  if (Array.isArray(v)) return v as Fila[];
  if (v && typeof v === "object") return [v as Fila];
  return [];
}

function imprimirTabla(
  resumen: { tabla: string; archivo: number; existian: number; nuevas: number }[],
) {
  const ultima = REVISAR ? "se insertarían" : "insertadas";
  const anchoTabla = Math.max(...resumen.map((r) => r.tabla.length), 6);
  const cols = ["en archivo", "ya existían", ultima];

  const linea = (celdas: string[]) =>
    "  " +
    celdas[0].padEnd(anchoTabla) +
    cols.map((c, i) => celdas[i + 1].padStart(c.length + 3)).join("");

  imprimir();
  imprimir(linea(["tabla", ...cols]));
  imprimir("  " + "─".repeat(anchoTabla + cols.reduce((s, c) => s + c.length + 3, 0)));
  for (const r of resumen) {
    imprimir(
      linea([r.tabla, String(r.archivo), String(r.existian), String(r.nuevas)]),
    );
  }
  const total = resumen.reduce((s, r) => s + r.nuevas, 0);
  imprimir();
  imprimir(
    REVISAR
      ? `  Revisión: se insertarían ${total} filas. No se escribió nada.`
      : `  Listo: ${total} filas insertadas.`,
  );
  imprimir();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  const correo = process.env.EMAIL_PERMITIDO;

  if (!url) morir("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  if (!secreta) morir("Falta SUPABASE_SECRET_KEY en .env.local");
  if (!correo) morir("Falta EMAIL_PERMITIDO en .env.local");

  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(readFileSync(ARCHIVO, "utf8"));
  } catch (e) {
    morir(`No se pudo leer ${ARCHIVO}: ${(e as Error).message}`);
  }

  // Validar ANTES de conectarse: si el archivo está malo, no se toca la base.
  const { ok, errores } = validarSemilla(datos);
  if (!ok) {
    console.error(`\n  El archivo tiene ${errores.length} error(es):\n`);
    for (const e of errores) console.error(`    ${e.ruta}: ${e.problema}`);
    console.error("\n  No se escribió nada. Corrige el archivo y vuelve a correr.\n");
    process.exit(1);
  }

  const supabase = createClient(url, secreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const usuario = await buscarUsuario(supabase, correo);
  if (!usuario) {
    morir(
      `No existe ningún usuario con el correo ${correo}. ` +
        "Créalo en el dashboard de Supabase antes de cargar la semilla.",
    );
  }

  imprimir(`\n  Usuario: ${usuario.email}`);
  imprimir(`  Archivo: ${ARCHIVO}`);
  if (REVISAR) imprimir("  Modo revisar: no se escribe nada.");

  const resumen: {
    tabla: string;
    archivo: number;
    existian: number;
    nuevas: number;
  }[] = [];

  for (const plan of PLANES) {
    const delArchivo = filasDelArchivo(datos, plan.tabla);

    const { data: existentes, error } = await supabase
      .from(plan.tabla)
      .select(plan.columnas)
      .eq("user_id", usuario.id);
    if (error) morir(`Error leyendo ${plan.tabla}: ${error.message}`);

    // El tipo que infiere supabase-js para un select dinámico no es un objeto
    // indexable; el cast pasa por unknown a propósito.
    const yaEstan = new Set(
      (existentes ?? []).map((f) => plan.clave(f as unknown as Fila)),
    );
    const faltan = delArchivo.filter((f) => !yaEstan.has(plan.clave(f)));

    if (faltan.length > 0 && !REVISAR) {
      const aInsertar = faltan.map((f) => ({
        ...(plan.alInsertar ? plan.alInsertar(f) : f),
        user_id: usuario.id,
      }));
      const { error: errorInsert } = await supabase
        .from(plan.tabla)
        .insert(aInsertar);
      if (errorInsert) {
        morir(`Error insertando en ${plan.tabla}: ${errorInsert.message}`);
      }
    }

    resumen.push({
      tabla: plan.tabla,
      archivo: delArchivo.length,
      existian: delArchivo.length - faltan.length,
      nuevas: faltan.length,
    });
  }

  imprimirTabla(resumen);
}

main().catch((e) => morir(String(e)));

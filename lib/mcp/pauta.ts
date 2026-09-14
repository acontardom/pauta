import { estadoComida, textoLitros, totalesDia } from "@/lib/dia";
import { ESTADOS_TOBILLO, GRUPOS, TIEMPOS, type ClaveTiempo } from "@/lib/dominio";
import { formatoDiaMes, formatoLargo, hoyChile, sumarDias } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";
import {
  limpiarPorciones,
  porcionesVacias,
  textoPorciones,
} from "@/lib/porciones";
import { construirSemana, textoPromedioKcal } from "@/lib/semana";
import type {
  Comida,
  Dia,
  Menu,
  ModoComida,
  Porciones,
} from "@/lib/supabase/tipos";
import { validarComida, validarDia } from "@/lib/validarComida";

/*
  Las cinco herramientas del servidor MCP, sin nada de MCP ni de Supabase.

  Cada una recibe un Repositorio (la base, o uno en memoria en las pruebas) y
  devuelve texto compacto para que Claude lo lea. Las reglas son las de la app:
  - las porciones de un menú se leen del menú guardado y se COPIAN a la comida,
    igual que guardarComida en app/(app)/hoy/acciones.ts;
  - una comida estimada (comí fuera) suma igual y no es una falta;
  - no se registran días futuros;
  - la semana son 7 días móviles que terminan hoy, como la pantalla Semana.
*/

export type ConfigPauta = {
  metas_porciones: Porciones;
  meta_agua_ml: number | null;
};

export type DiaPauta = Pick<
  Dia,
  | "fecha"
  | "agua_ml"
  | "kcal_activas"
  | "entrenamiento"
  | "entrenamiento_minutos"
  | "estado_tobillo"
  | "cerrado"
>;

/** Lo que se escribe en comidas. El user_id lo agrega el repositorio. */
export type FilaComida = Pick<
  Comida,
  | "fecha"
  | "tiempo"
  | "modo"
  | "menu_id"
  | "nombre_menu"
  | "texto_libre"
  | "porciones"
  | "kcal"
>;

export type Repositorio = {
  configuracion(): Promise<ConfigPauta | null>;
  /** Comidas entre dos fechas, ambas incluidas. */
  comidas(desde: string, hasta: string): Promise<Comida[]>;
  dias(desde: string, hasta: string): Promise<DiaPauta[]>;
  menus(tiempo?: ClaveTiempo): Promise<Menu[]>;
  menu(id: string): Promise<Menu | null>;
  guardarComida(fila: FilaComida): Promise<void>;
  guardarAgua(fecha: string, aguaMl: number): Promise<void>;
};

export type Resultado = { ok: true; texto: string } | { ok: false; error: string };

/** La misma que usa Hoy cuando la configuración no trae meta de agua. */
export const META_AGUA_POR_DEFECTO = 2000;

/** Tope por registro de agua: evita que un error de unidades sume litros de más. */
export const MAXIMO_ML_POR_REGISTRO = 5000;

const MILES = new Intl.NumberFormat("es-CL");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETIQUETA_TIEMPO = new Map<string, string>(
  TIEMPOS.map((t) => [t.clave, t.etiqueta]),
);

function error(mensaje: string): Resultado {
  return { ok: false, error: mensaje };
}

function esFechaIso(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

function validarFechaLectura(fecha: string, hoy: string): string | null {
  if (!esFechaIso(fecha)) return "La fecha debe tener el formato AAAA-MM-DD.";
  if (fecha > hoy) return "Esa fecha todavía no llega: no hay registros de días futuros.";
  return null;
}

/** "Martes 15 de septiembre" → "martes 15 de septiembre", para ir a mitad de frase. */
function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function describirComida(
  c: Pick<Comida, "modo" | "nombre_menu" | "texto_libre" | "porciones" | "kcal">,
): string {
  const contenido = textoPorciones(c.porciones, c.kcal) || "sin porciones";
  if (c.modo === "menu") return `menú "${c.nombre_menu ?? "sin nombre"}" · ${contenido}`;
  if (c.modo === "fuera") {
    return `comí fuera, estimada ("${c.texto_libre ?? "Comí fuera"}") · ${contenido}`;
  }
  return `porciones marcadas · ${contenido}`;
}

/** Una línea por grupo: lo que lleva, la meta y lo que falta. */
function lineasPorciones(comidas: Comida[], metas: Porciones): string[] {
  const { porciones } = totalesDia(comidas);
  return GRUPOS.map((g) => {
    const valor = porciones[g.clave] ?? 0;
    const meta = metas[g.clave];
    if (meta == null) return `- ${g.etiqueta}: ${formatear(valor)} (sin meta)`;
    const faltan = Math.max(0, Math.round((meta - valor) * 100) / 100);
    return `- ${g.etiqueta}: ${formatear(valor)} de ${formatear(meta)} · ${
      faltan > 0 ? `faltan ${formatear(faltan)}` : "meta cumplida"
    }`;
  });
}

/** Kcal que aportan las comidas del día. No son las activas: no se mezclan. */
function lineaKcalComidas(comidas: Comida[]): string {
  const { kcal, comidasConKcal } = totalesDia(comidas);
  return `Kcal aportadas por las comidas: ${
    comidasConKcal === 0 ? "sin dato" : `≈${MILES.format(kcal)}`
  }`;
}

/** Promedio y cantidad de valores, calculados de la misma lista. */
function promedioDe(valores: number[]): { promedio: number | null; dias: number } {
  return {
    promedio: valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : null,
    dias: valores.length,
  };
}

/** "sobre 3 días con dato", para que un promedio se pueda auditar. */
function sobreDias(n: number): string {
  return n === 0 ? "ningún día con dato" : `sobre ${n} ${n === 1 ? "día" : "días"} con dato`;
}

function textoAguaConMeta(aguaMl: number, metaMl: number): string {
  const falta = Math.max(0, metaMl - aguaMl);
  return `${textoLitros(aguaMl)} de ${textoLitros(metaMl)} L · ${
    falta > 0 ? `faltan ${textoLitros(falta)} L` : "meta cumplida"
  }`;
}

/* ------------------------------------------------------------------------- */
/* obtener_dia                                                               */
/* ------------------------------------------------------------------------- */

export async function obtenerDia(
  repo: Repositorio,
  entrada: { fecha?: string },
  ahora: Date = new Date(),
): Promise<Resultado> {
  const hoy = hoyChile(ahora);
  const fecha = entrada.fecha ?? hoy;
  const problema = validarFechaLectura(fecha, hoy);
  if (problema) return error(problema);

  const [config, comidas, dias] = await Promise.all([
    repo.configuracion(),
    repo.comidas(fecha, fecha),
    repo.dias(fecha, fecha),
  ]);
  const dia = dias[0] ?? null;

  const porTiempo = new Map(comidas.map((c) => [c.tiempo, c]));
  const registradas = comidas.filter((c) => estadoComida(c) !== "pendiente").length;
  const metaAgua = config?.meta_agua_ml ?? META_AGUA_POR_DEFECTO;
  const tobillo = ESTADOS_TOBILLO.find((e) => e.clave === dia?.estado_tobillo);
  const entrenamiento = dia?.entrenamiento?.length
    ? dia.entrenamiento.join(", ") +
      (dia.entrenamiento_minutos ? ` · ${dia.entrenamiento_minutos} min` : "")
    : "sin registro";

  const lineas = [
    `${formatoLargo(fecha)} (${fecha})${fecha === hoy ? ", hoy" : ""} · ${
      dia?.cerrado ? "día cerrado" : "día abierto"
    }`,
    "",
    `Comidas (${registradas} de ${TIEMPOS.length}):`,
    ...TIEMPOS.map((t) => {
      const c = porTiempo.get(t.clave);
      return `- ${t.etiqueta}: ${c ? describirComida(c) : "pendiente"}`;
    }),
    "",
    config
      ? "Porciones del día:"
      : "Porciones del día (falta la configuración: no hay metas):",
    ...lineasPorciones(comidas, config?.metas_porciones ?? {}),
    lineaKcalComidas(comidas),
    "",
    `Agua: ${textoAguaConMeta(dia?.agua_ml ?? 0, metaAgua)}`,
    // Son calorías gastadas: no se suman ni restan con las de las comidas.
    `Calorías activas (gastadas): ${
      dia?.kcal_activas != null ? `${MILES.format(dia.kcal_activas)} kcal` : "sin registro"
    }`,
    `Entrenamiento: ${entrenamiento}`,
    `Tobillo: ${tobillo?.etiqueta ?? "sin registro"}`,
  ];

  return { ok: true, texto: lineas.join("\n") };
}

/* ------------------------------------------------------------------------- */
/* listar_menus                                                              */
/* ------------------------------------------------------------------------- */

export async function listarMenus(
  repo: Repositorio,
  entrada: { tiempo?: string },
): Promise<Resultado> {
  const { tiempo } = entrada;
  if (tiempo && !ETIQUETA_TIEMPO.has(tiempo)) {
    return error(`El tiempo debe ser uno de: ${TIEMPOS.map((t) => t.clave).join(", ")}.`);
  }

  const menus = await repo.menus(tiempo as ClaveTiempo | undefined);
  const sufijo = tiempo ? ` de ${ETIQUETA_TIEMPO.get(tiempo)!.toLowerCase()}` : "";
  if (menus.length === 0) return { ok: true, texto: `No hay menús guardados${sufijo}.` };

  const lineas = [
    `${menus.length} ${menus.length === 1 ? "menú" : "menús"}${sufijo}. Para registrar uno, usa su id en registrar_comida con modo "menu".`,
  ];

  for (const t of TIEMPOS) {
    const delTiempo = menus
      .filter((m) => m.tiempo === t.clave)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    if (delTiempo.length === 0) continue;

    lineas.push("", `${t.etiqueta}:`);
    for (const m of delTiempo) {
      lineas.push(
        `- ${m.nombre} (id: ${m.id})`,
        `  Porciones: ${textoPorciones(m.porciones, m.kcal) || "sin porciones asignadas"}`,
      );
      if (m.ingredientes.length > 0) {
        lineas.push(`  Ingredientes: ${m.ingredientes.join("; ")}`);
      }
      if (m.observacion) lineas.push(`  Observación: ${m.observacion}`);
    }
  }

  return { ok: true, texto: lineas.join("\n") };
}

/* ------------------------------------------------------------------------- */
/* registrar_comida                                                          */
/* ------------------------------------------------------------------------- */

export type EntradaRegistrarComida = {
  fecha?: string;
  tiempo: string;
  modo: ModoComida;
  menu_id?: string;
  porciones?: Porciones;
  texto_libre?: string;
  /** Calorías aportadas, solo en modo manual o fuera. En modo menu se ignoran. */
  kcal?: number;
};

export async function registrarComida(
  repo: Repositorio,
  entrada: EntradaRegistrarComida,
  ahora: Date = new Date(),
): Promise<Resultado> {
  const hoy = hoyChile(ahora);
  const fecha = entrada.fecha ?? hoy;
  const { tiempo, modo, menu_id, porciones, texto_libre, kcal } = entrada;

  const validacion = validarComida(
    // En modo menu las kcal enviadas se ignoran: no se validan ni se guardan.
    { fecha, tiempo, porciones, texto: texto_libre, kcal: modo === "menu" ? null : kcal },
    ahora,
  );
  if (!validacion.ok) return error(`${validacion.error}.`);

  const etiqueta = ETIQUETA_TIEMPO.get(tiempo)!;
  const base = { fecha, tiempo: tiempo as ClaveTiempo };
  let fila: FilaComida;
  const avisos: string[] = [];

  if (modo === "menu") {
    if (!menu_id) return error('En modo "menu" falta menu_id. Búscalo con listar_menus.');
    if (porciones || texto_libre) {
      return error('En modo "menu" las porciones salen del menú: no envíes porciones ni texto_libre.');
    }
    if (!UUID.test(menu_id)) return error("El menu_id no es válido.");

    // Se lee el menú guardado y se copian nombre, porciones y kcal, igual que
    // en la app: editar o borrar el menú después no cambia esta comida.
    const menu = await repo.menu(menu_id);
    if (!menu) return error("No existe un menú con ese menu_id.");

    fila = {
      ...base,
      modo: "menu",
      menu_id: menu.id,
      nombre_menu: menu.nombre,
      texto_libre: null,
      porciones: limpiarPorciones(menu.porciones),
      kcal: menu.kcal,
    };
    if (kcal != null) {
      avisos.push(
        `Se ignoraron las ${MILES.format(kcal)} kcal enviadas: en modo "menu" se usan las del menú (${
          menu.kcal != null ? `${MILES.format(menu.kcal)} kcal` : "sin kcal"
        }).`,
      );
    }
    if (menu.tiempo !== tiempo) {
      avisos.push(
        `Ojo: es un menú de ${ETIQUETA_TIEMPO.get(menu.tiempo)?.toLowerCase()}, registrado en ${etiqueta.toLowerCase()}.`,
      );
    }
  } else if (modo === "manual") {
    if (menu_id || texto_libre) {
      return error('En modo "manual" solo van porciones: no envíes menu_id ni texto_libre.');
    }
    const limpias = limpiarPorciones(porciones);
    if (porcionesVacias(limpias)) {
      return error('En modo "manual" marca al menos una porción.');
    }
    fila = {
      ...base,
      modo: "manual",
      menu_id: null,
      nombre_menu: null,
      texto_libre: null,
      porciones: limpias,
      kcal: kcal ?? null,
    };
  } else if (modo === "fuera") {
    if (menu_id) return error('En modo "fuera" no va menu_id.');
    // Estimada: las porciones pueden ir vacías.
    const texto = texto_libre?.trim();
    fila = {
      ...base,
      modo: "fuera",
      menu_id: null,
      nombre_menu: null,
      texto_libre: texto ? texto : "Comí fuera",
      porciones: limpiarPorciones(porciones),
      kcal: kcal ?? null,
    };
  } else {
    return error('El modo debe ser "menu", "manual" o "fuera".');
  }

  const anterior = (await repo.comidas(fecha, fecha)).find((c) => c.tiempo === tiempo);
  await repo.guardarComida(fila);
  const [config, comidas, dias] = await Promise.all([
    repo.configuracion(),
    repo.comidas(fecha, fecha),
    repo.dias(fecha, fecha),
  ]);

  const lineas = [
    `Registrado en ${etiqueta.toLowerCase()} del ${minuscula(formatoLargo(fecha))}: ${describirComida(fila)}.`,
  ];
  if (anterior) {
    lineas.push(
      `Reemplazó lo que ya había registrado en ${etiqueta.toLowerCase()}: ${describirComida(anterior)}.`,
    );
  }
  lineas.push(...avisos);
  // El acumulado completo, para no tener que llamar a obtener_dia para verificar.
  lineas.push(
    "",
    "Acumulado del día:",
    ...lineasPorciones(comidas, config?.metas_porciones ?? {}),
    lineaKcalComidas(comidas),
    `Agua: ${textoAguaConMeta(
      dias[0]?.agua_ml ?? 0,
      config?.meta_agua_ml ?? META_AGUA_POR_DEFECTO,
    )}`,
  );

  return { ok: true, texto: lineas.join("\n") };
}

/* ------------------------------------------------------------------------- */
/* registrar_agua                                                            */
/* ------------------------------------------------------------------------- */

export async function registrarAgua(
  repo: Repositorio,
  entrada: { fecha?: string; ml: number },
  ahora: Date = new Date(),
): Promise<Resultado> {
  const hoy = hoyChile(ahora);
  const fecha = entrada.fecha ?? hoy;
  const { ml } = entrada;

  const fechaOk = validarDia(fecha, {}, ahora);
  if (!fechaOk.ok) return error(`${fechaOk.error}.`);
  if (!Number.isInteger(ml) || ml <= 0) return error("ml debe ser un entero mayor que 0.");
  if (ml > MAXIMO_ML_POR_REGISTRO) {
    return error(`Como máximo ${MILES.format(MAXIMO_ML_POR_REGISTRO)} ml por registro.`);
  }

  const dia = (await repo.dias(fecha, fecha))[0] ?? null;
  const total = (dia?.agua_ml ?? 0) + ml;
  await repo.guardarAgua(fecha, total);

  const config = await repo.configuracion();
  const meta = config?.meta_agua_ml ?? META_AGUA_POR_DEFECTO;

  return {
    ok: true,
    texto: [
      `Sumados ${MILES.format(ml)} ml al ${minuscula(formatoLargo(fecha))}.`,
      `Agua del día: ${textoAguaConMeta(total, meta)}`,
    ].join("\n"),
  };
}

/* ------------------------------------------------------------------------- */
/* obtener_resumen_semana                                                    */
/* ------------------------------------------------------------------------- */

export async function resumenSemana(
  repo: Repositorio,
  entrada: { fecha_inicio?: string },
  ahora: Date = new Date(),
): Promise<Resultado> {
  const hoy = hoyChile(ahora);
  // Por defecto, la misma semana que la pantalla: 7 días móviles hasta hoy.
  const inicio = entrada.fecha_inicio ?? sumarDias(hoy, -6);
  const problema = validarFechaLectura(inicio, hoy);
  if (problema) return error(problema);

  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
  const fin = fechas[6];

  const [config, dias, comidas] = await Promise.all([
    repo.configuracion(),
    repo.dias(inicio, fin),
    repo.comidas(inicio, fin),
  ]);

  const metas = config?.metas_porciones ?? {};
  const semana = construirSemana(fechas, dias, comidas, {
    metas_porciones: metas,
    meta_agua_ml: config?.meta_agua_ml ?? null,
  });
  const registrados = semana.filter((d) => d.cerrado).length;
  const conMeta = GRUPOS.filter((g) => (metas[g.clave] ?? 0) > 0);
  /*
    Cada promedio sale de la misma lista de valores que su conteo, así el número
    y "sobre N días" no pueden separarse. El criterio es el de promedios() en
    lib/semana.ts: agua mayor que 0 (igual que "agua sin registro" en cada día)
    y calorías activas no nulas.
  */
  const aguaSemana = promedioDe(
    dias.map((d) => d.agua_ml).filter((v): v is number => v != null && v > 0),
  );
  const kcalSemana = promedioDe(
    dias.map((d) => d.kcal_activas).filter((v): v is number => v != null),
  );

  const lineas = [
    `Semana del ${formatoDiaMes(inicio)} al ${formatoDiaMes(fin)}`,
    `Días registrados (cerrados): ${registrados}/7`,
    "",
    `Por día (metas de porciones cumplidas de ${conMeta.length}):`,
    ...semana.map((d) => {
      const encabezado = `- ${d.etiqueta} (${d.fecha}) · ${d.cerrado ? "registrado" : "abierto"}`;
      if (d.fecha > hoy) return `${encabezado} · todavía no llega`;
      const agua = d.dia?.agua_ml ? `agua ${textoLitros(d.dia.agua_ml)} L` : "agua sin registro";
      if (d.comidas.length === 0) return `${encabezado} · sin comidas registradas · ${agua}`;

      const cumplidos = d.celdas
        .filter((c) => c.razon >= 1)
        .map((c) => GRUPOS.find((g) => g.clave === c.grupo)!.etiqueta.toLowerCase());
      return (
        `${encabezado} · ${d.comidas.length} de ${TIEMPOS.length} comidas` +
        (d.estimado ? " (con comida estimada)" : "") +
        ` · cumplidas ${cumplidos.length}: ${cumplidos.join(", ") || "ninguna"}` +
        ` · ${agua}`
      );
    }),
    "",
    // Promedios sobre los días que tienen el dato, como en la pantalla Semana.
    // El agua va con dos decimales, igual que la de cada día: el redondeo a
    // 50 ml de la pantalla haría que no cuadre con los días que se muestran.
    `Promedio de agua: ${
      aguaSemana.promedio == null ? "—" : `${textoLitros(aguaSemana.promedio)} L`
    } (${sobreDias(aguaSemana.dias)}) · ` +
      `calorías activas: ${textoPromedioKcal(kcalSemana.promedio)} (${sobreDias(kcalSemana.dias)})`,
  ];

  return { ok: true, texto: lineas.join("\n") };
}

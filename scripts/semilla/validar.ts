import { GRUPOS, TIEMPOS } from "../../lib/dominio";

/*
  Validación del archivo de semilla.

  Es una función pura: no toca la base ni el disco. El script de carga la
  ejecuta ANTES de escribir nada, y si hay un solo error no inserta ninguna
  fila. Por eso cada error lleva su ruta exacta ("menus[3].porciones.aceite"):
  el archivo se corrige a mano, y hay que poder encontrar el punto sin buscar.
*/

export type ErrorSemilla = { ruta: string; problema: string };
export type Resultado = { ok: boolean; errores: ErrorSemilla[] };

const CLAVES_GRUPO = new Set(GRUPOS.map((g) => g.clave as string));
const PASO_GRUPO = new Map(GRUPOS.map((g) => [g.clave as string, g.paso]));
const CLAVES_TIEMPO = new Set(TIEMPOS.map((t) => t.clave as string));

/** Las tablas del archivo, en el orden en que se cargan. */
export const TABLAS = [
  "configuracion",
  "hitos",
  "menus",
  "alimentos",
  "medidas",
  "inbody",
  "entradas_recuperacion",
  "preguntas_control",
  "rutinas",
] as const;

export const COLUMNAS_INBODY = [
  "peso",
  "masa_grasa",
  "pct_grasa",
  "masa_musculoesqueletica",
  "masa_libre_grasa",
  "agua_total",
] as const;

const TIPOS_ENTRADA = new Set(["control", "kine", "nota"]);
const HINCHAZONES = new Set(["menos", "igual", "mas"]);

/** Formatea un número como lo escribe la app: coma decimal. */
function coma(n: number) {
  return String(n).replace(".", ",");
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function esTextoConContenido(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** "YYYY-MM-DD" que además existe en el calendario (rechaza 2026-02-30). */
function esFechaValida(v: unknown): v is string {
  if (typeof v !== "string") return false;
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

function esHoraValida(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/*
  Los múltiplos se comprueban en enteros. 0.3 / 0.5 en punto flotante no da
  exacto, y un residuo de 1e-17 marcaría como inválido un valor correcto.
*/
function esMultiplo(valor: number, paso: number) {
  const escala = 1000;
  return Math.round(valor * escala) % Math.round(paso * escala) === 0;
}

class Acumulador {
  errores: ErrorSemilla[] = [];

  agregar(ruta: string, problema: string) {
    this.errores.push({ ruta, problema });
  }

  /** Objeto de porciones: claves conocidas, valores >= 0 y múltiplos del paso. */
  porciones(ruta: string, valor: unknown) {
    if (!esObjeto(valor)) {
      this.agregar(ruta, "debe ser un objeto de porciones");
      return;
    }
    for (const [clave, v] of Object.entries(valor)) {
      const r = `${ruta}.${clave}`;
      if (!CLAVES_GRUPO.has(clave)) {
        this.agregar(r, `"${clave}" no es un grupo conocido`);
        continue;
      }
      if (typeof v !== "number" || !Number.isFinite(v)) {
        this.agregar(r, "debe ser un número");
        continue;
      }
      if (v < 0) {
        this.agregar(r, "no puede ser negativo");
        continue;
      }
      const paso = PASO_GRUPO.get(clave)!;
      if (!esMultiplo(v, paso)) {
        this.agregar(r, `debe ser múltiplo de ${coma(paso)}`);
      }
    }
  }

  fecha(ruta: string, valor: unknown, { nulaOk = false } = {}) {
    if (valor === null || valor === undefined) {
      if (!nulaOk) this.agregar(ruta, "la fecha es obligatoria");
      return;
    }
    if (!esFechaValida(valor)) {
      this.agregar(ruta, 'debe ser una fecha "YYYY-MM-DD" válida');
    }
  }

  /** Entero >= 0, o null si se permite. */
  entero(ruta: string, valor: unknown, { nuloOk = true, minimo = 0 } = {}) {
    if (valor === null || valor === undefined) {
      if (!nuloOk) this.agregar(ruta, "es obligatorio");
      return;
    }
    if (typeof valor !== "number" || !Number.isInteger(valor)) {
      this.agregar(ruta, "debe ser un número entero");
      return;
    }
    if (valor < minimo) {
      this.agregar(ruta, `debe ser mayor o igual a ${minimo}`);
    }
  }

  /** Número mayor que cero, o null si se permite. */
  positivo(ruta: string, valor: unknown, { nuloOk = true } = {}) {
    if (valor === null || valor === undefined) {
      if (!nuloOk) this.agregar(ruta, "es obligatorio");
      return;
    }
    if (typeof valor !== "number" || !Number.isFinite(valor)) {
      this.agregar(ruta, "debe ser un número");
      return;
    }
    if (valor <= 0) this.agregar(ruta, "debe ser mayor que cero");
  }

  texto(ruta: string, valor: unknown, { maximo }: { maximo?: number } = {}) {
    if (!esTextoConContenido(valor)) {
      this.agregar(ruta, "no puede estar vacío");
      return;
    }
    if (maximo !== undefined && valor.length > maximo) {
      this.agregar(ruta, `no puede pasar de ${maximo} caracteres`);
    }
  }

  arregloDeTextos(ruta: string, valor: unknown) {
    if (!Array.isArray(valor)) {
      this.agregar(ruta, "debe ser un arreglo");
      return;
    }
    valor.forEach((v, i) => {
      if (!esTextoConContenido(v)) {
        this.agregar(`${ruta}[${i}]`, "no puede estar vacío");
      }
    });
  }

  /** Marca como error toda repetición de una clave natural. */
  sinDuplicados(
    base: string,
    filas: unknown[],
    clave: (fila: Record<string, unknown>) => string,
    descripcion: string,
  ) {
    const vistos = new Map<string, number>();
    filas.forEach((fila, i) => {
      if (!esObjeto(fila)) return;
      const k = clave(fila);
      const antes = vistos.get(k);
      if (antes !== undefined) {
        this.agregar(
          `${base}[${i}]`,
          `${descripcion} repetido, ya está en ${base}[${antes}]`,
        );
      } else {
        vistos.set(k, i);
      }
    });
  }

  /** Devuelve el arreglo de esa clave, o null si no es un arreglo. */
  arreglo(datos: Record<string, unknown>, clave: string): unknown[] | null {
    const v = datos[clave];
    if (v === undefined) {
      this.agregar(clave, "falta en el archivo");
      return null;
    }
    if (!Array.isArray(v)) {
      this.agregar(clave, "debe ser un arreglo");
      return null;
    }
    return v;
  }
}

export function validarSemilla(datos: unknown): Resultado {
  const a = new Acumulador();

  if (!esObjeto(datos)) {
    return { ok: false, errores: [{ ruta: "", problema: "debe ser un objeto" }] };
  }

  // Las claves que empiezan con "_" son notas del archivo, no datos.
  const claves = Object.keys(datos).filter((k) => !k.startsWith("_"));
  for (const k of claves) {
    if (!(TABLAS as readonly string[]).includes(k)) {
      a.agregar(k, "no corresponde a ninguna tabla conocida");
    }
  }

  validarConfiguracion(a, datos.configuracion);
  validarHitos(a, datos);
  validarMenus(a, datos);
  validarAlimentos(a, datos);
  validarMedidas(a, datos);
  validarInbody(a, datos);
  validarEntradas(a, datos);
  validarPreguntas(a, datos);
  validarRutinas(a, datos);

  return { ok: a.errores.length === 0, errores: a.errores };
}

function validarConfiguracion(a: Acumulador, c: unknown) {
  if (c === undefined) {
    a.agregar("configuracion", "falta en el archivo");
    return;
  }
  if (!esObjeto(c)) {
    a.agregar("configuracion", "debe ser un objeto");
    return;
  }

  a.porciones("configuracion.metas_porciones", c.metas_porciones);
  a.entero("configuracion.meta_agua_ml", c.meta_agua_ml, {
    nuloOk: false,
    minimo: 1,
  });
  a.positivo("configuracion.meta_pct_grasa", c.meta_pct_grasa);
  a.positivo("configuracion.meta_peso", c.meta_peso);
  a.positivo("configuracion.meta_cintura", c.meta_cintura);
  a.fecha("configuracion.fecha_operacion", c.fecha_operacion, { nulaOk: true });
  a.fecha("configuracion.fecha_retorno", c.fecha_retorno, { nulaOk: true });

  // Horarios: los 5 tiempos, ni más ni menos.
  const h = c.horarios;
  if (!esObjeto(h)) {
    a.agregar("configuracion.horarios", "debe ser un objeto");
    return;
  }
  for (const t of TIEMPOS) {
    if (!(t.clave in h)) {
      a.agregar(`configuracion.horarios.${t.clave}`, "falta este tiempo");
    } else if (!esHoraValida(h[t.clave])) {
      a.agregar(`configuracion.horarios.${t.clave}`, 'debe tener formato "HH:MM"');
    }
  }
  for (const k of Object.keys(h)) {
    if (!CLAVES_TIEMPO.has(k)) {
      a.agregar(`configuracion.horarios.${k}`, `"${k}" no es un tiempo conocido`);
    }
  }
}

function validarHitos(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "hitos");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `hitos[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    a.texto(`${r}.clave`, fila.clave);
    a.texto(`${r}.nombre`, fila.nombre);
    a.fecha(`${r}.fecha_planificada`, fila.fecha_planificada, { nulaOk: true });
    a.fecha(`${r}.fecha_real`, fila.fecha_real, { nulaOk: true });
  });

  a.sinDuplicados("hitos", filas, (f) => String(f.clave), "clave de hito");
}

function validarMenus(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "menus");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `menus[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    if (!CLAVES_TIEMPO.has(String(fila.tiempo))) {
      a.agregar(`${r}.tiempo`, `"${fila.tiempo}" no es un tiempo conocido`);
    }
    a.texto(`${r}.nombre`, fila.nombre, { maximo: 80 });
    a.arregloDeTextos(`${r}.ingredientes`, fila.ingredientes);
    if (fila.observacion !== null && fila.observacion !== undefined) {
      a.texto(`${r}.observacion`, fila.observacion);
    }
    a.porciones(`${r}.porciones`, fila.porciones);
    a.entero(`${r}.kcal`, fila.kcal);
  });

  a.sinDuplicados(
    "menus",
    filas,
    (f) => `${f.tiempo} ${f.nombre}`,
    "menú (tiempo, nombre)",
  );
}

function validarAlimentos(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "alimentos");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `alimentos[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    if (!CLAVES_GRUPO.has(String(fila.grupo))) {
      a.agregar(`${r}.grupo`, `"${fila.grupo}" no es un grupo conocido`);
    }
    a.texto(`${r}.nombre`, fila.nombre);
    a.texto(`${r}.medida_casera`, fila.medida_casera);
    a.positivo(`${r}.gramos`, fila.gramos);
    a.entero(`${r}.orden`, fila.orden, { nuloOk: false, minimo: 0 });
  });

  a.sinDuplicados(
    "alimentos",
    filas,
    (f) => `${f.grupo} ${f.nombre}`,
    "alimento (grupo, nombre)",
  );
}

function validarMedidas(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "medidas");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `medidas[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    a.fecha(`${r}.fecha`, fila.fecha);
    a.positivo(`${r}.peso`, fila.peso);
    a.positivo(`${r}.cintura`, fila.cintura);
    if (fila.peso == null && fila.cintura == null) {
      a.agregar(r, "necesita al menos peso o cintura");
    }
  });
}

function validarInbody(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "inbody");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `inbody[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    a.fecha(`${r}.fecha`, fila.fecha);

    for (const k of Object.keys(fila)) {
      if (k === "fecha") continue;
      if (!(COLUMNAS_INBODY as readonly string[]).includes(k)) {
        // grasa_visceral cae acá: la columna se eliminó en la migración 2.
        a.agregar(`${r}.${k}`, `"${k}" no es una columna de inbody`);
      }
    }

    let alguno = false;
    for (const k of COLUMNAS_INBODY) {
      a.positivo(`${r}.${k}`, fila[k]);
      if (fila[k] != null) alguno = true;
    }
    if (!alguno) a.agregar(r, "necesita al menos un valor");
  });
}

function validarEntradas(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "entradas_recuperacion");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `entradas_recuperacion[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }

    a.fecha(`${r}.fecha`, fila.fecha);

    const tipo = String(fila.tipo);
    if (!TIPOS_ENTRADA.has(tipo)) {
      a.agregar(`${r}.tipo`, `"${fila.tipo}" no es control, kine ni nota`);
    }

    if (fila.hinchazon != null && !HINCHAZONES.has(String(fila.hinchazon))) {
      a.agregar(`${r}.hinchazon`, `"${fila.hinchazon}" no es menos, igual ni mas`);
    }

    a.entero(`${r}.numero_sesion`, fila.numero_sesion, { minimo: 1 });
    a.arregloDeTextos(`${r}.autorizado`, fila.autorizado);

    // Los mismos límites que los check constraints de la tabla.
    if (tipo !== "kine") {
      if (fila.numero_sesion != null) {
        a.agregar(`${r}.numero_sesion`, "solo puede tener valor si el tipo es kine");
      }
      if (fila.hinchazon != null) {
        a.agregar(`${r}.hinchazon`, "solo puede tener valor si el tipo es kine");
      }
    }
    if (tipo !== "control") {
      if (fila.indicaciones != null) {
        a.agregar(`${r}.indicaciones`, "solo puede tener valor si el tipo es control");
      }
      if (fila.proximo_control != null) {
        a.agregar(
          `${r}.proximo_control`,
          "solo puede tener valor si el tipo es control",
        );
      }
    }
    a.fecha(`${r}.proximo_control`, fila.proximo_control, { nulaOk: true });
  });
}

function validarPreguntas(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "preguntas_control");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `preguntas_control[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    a.texto(`${r}.texto`, fila.texto);
  });

  a.sinDuplicados(
    "preguntas_control",
    filas,
    (f) => String(f.texto),
    "texto de pregunta",
  );
}

function validarRutinas(a: Acumulador, datos: Record<string, unknown>) {
  const filas = a.arreglo(datos, "rutinas");
  if (!filas) return;

  filas.forEach((fila, i) => {
    const r = `rutinas[${i}]`;
    if (!esObjeto(fila)) {
      a.agregar(r, "debe ser un objeto");
      return;
    }
    a.texto(`${r}.bloque`, fila.bloque);
    a.texto(`${r}.clave`, fila.clave);
    a.texto(`${r}.nombre`, fila.nombre);
    a.entero(`${r}.orden`, fila.orden, { nuloOk: false, minimo: 0 });
    if (fila.activa !== undefined && typeof fila.activa !== "boolean") {
      a.agregar(`${r}.activa`, "debe ser true o false");
    }
    if (fila.nota !== null && fila.nota !== undefined) {
      a.texto(`${r}.nota`, fila.nota);
    }

    // Las mismas reglas que el check ejercicios_validos de la tabla.
    const ejercicios = fila.ejercicios;
    if (!Array.isArray(ejercicios)) {
      a.agregar(`${r}.ejercicios`, "debe ser un arreglo");
      return;
    }
    ejercicios.forEach((e, j) => {
      const re = `${r}.ejercicios[${j}]`;
      if (!esObjeto(e)) {
        a.agregar(re, "debe ser un objeto");
        return;
      }
      a.texto(`${re}.nombre`, e.nombre);
      a.entero(`${re}.series`, e.series, { nuloOk: false, minimo: 1 });
      a.texto(`${re}.reps`, e.reps);
      a.entero(`${re}.orden`, e.orden, { minimo: 0 });
      a.entero(`${re}.descanso_seg`, e.descanso_seg, { minimo: 0 });
      if (e.notas !== null && e.notas !== undefined) {
        a.texto(`${re}.notas`, e.notas);
      }
    });
  });

  a.sinDuplicados(
    "rutinas",
    filas,
    (f) => `${f.bloque}${String.fromCharCode(31)}${f.clave}`,
    "rutina (bloque, clave)",
  );
}

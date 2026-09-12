/*
  Claves de dominio. Son las mismas que usa la base de datos (check constraints)
  y deben mantenerse sincronizadas con la migración del esquema.

  Acá van solo las claves y sus etiquetas. Las metas y los horarios NO son
  constantes: viven en la tabla configuracion.
*/

/*
  `paso` es el incremento mínimo de ese grupo: aceite y grasas se cuentan en
  medias porciones, el resto en enteras. Lo usan la validación de la semilla y
  el selector de porciones.
*/
export const GRUPOS = [
  { clave: "cereales", etiqueta: "Cereales", corta: "Cer", paso: 1 },
  { clave: "verduras", etiqueta: "Verduras", corta: "Ver", paso: 1 },
  { clave: "fruta", etiqueta: "Fruta", corta: "Fru", paso: 1 },
  { clave: "proteicos", etiqueta: "Proteicos", corta: "Pro", paso: 1 },
  { clave: "lacteos", etiqueta: "Lácteos", corta: "Lác", paso: 1 },
  { clave: "aceite", etiqueta: "Aceite", corta: "Ace", paso: 0.5 },
  { clave: "grasas", etiqueta: "Grasas", corta: "Gra", paso: 0.5 },
] as const;

export const TIEMPOS = [
  { clave: "desayuno", etiqueta: "Desayuno" },
  { clave: "colacion_am", etiqueta: "Colación AM" },
  { clave: "almuerzo", etiqueta: "Almuerzo" },
  { clave: "colacion_pm", etiqueta: "Colación PM" },
  { clave: "cena", etiqueta: "Cena" },
] as const;

export type ClaveGrupo = (typeof GRUPOS)[number]["clave"];
export type ClaveTiempo = (typeof TIEMPOS)[number]["clave"];

/*
  Opciones de entrenamiento. Se guardan en dias.entrenamiento (text[]) con
  este mismo texto, así que cambiar una etiqueta rompe los registros viejos.

  "Descanso" NO es excluyente: se puede descansar y hacer kinesiología el
  mismo día.
*/
export const ENTRENAMIENTOS = [
  "Tren superior",
  "Core",
  "Bicicleta",
  "Kinesiología",
  "Descanso",
] as const;

export type Entrenamiento = (typeof ENTRENAMIENTOS)[number];

/** Estados del tobillo. "Peor" se ve igual que los otros: no es una alerta. */
export const ESTADOS_TOBILLO = [
  { clave: "mejor", etiqueta: "Mejor" },
  { clave: "igual", etiqueta: "Igual" },
  { clave: "peor", etiqueta: "Peor" },
] as const;

/*
  Campos de InBody, en el orden en que se muestran.

  Es la fuente de las etiquetas, unidades y direcciones de toda la pantalla:
  el formulario, las tarjetas comparativas y los deltas salen de acá.

  `direccion` dice qué es bueno: "baja" en peso y grasa, "sube" en masa
  musculoesquelética, masa libre de grasa y agua. La meta es bajar grasa
  PRESERVANDO masa magra, así que perder músculo no es neutro.

  grasa_visceral no está a propósito: la columna no existe.
*/
export const CAMPOS_INBODY = [
  { clave: "peso", etiqueta: "Peso", unidad: "kg", direccion: "baja", destacada: false },
  { clave: "masa_grasa", etiqueta: "Masa grasa", unidad: "kg", direccion: "baja", destacada: false },
  { clave: "pct_grasa", etiqueta: "% de grasa", unidad: "%", direccion: "baja", destacada: true },
  { clave: "masa_musculoesqueletica", etiqueta: "Masa musculoesquelética", unidad: "kg", direccion: "sube", destacada: true },
  { clave: "masa_libre_grasa", etiqueta: "Masa libre de grasa", unidad: "kg", direccion: "sube", destacada: false },
  { clave: "agua_total", etiqueta: "Agua corporal total", unidad: "L", direccion: "sube", destacada: false },
] as const;

export type ClaveInbody = (typeof CAMPOS_INBODY)[number]["clave"];
export type DireccionInbody = "baja" | "sube";


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

/*
  Claves de dominio. Son las mismas que usa la base de datos (check constraints)
  y deben mantenerse sincronizadas con la migración del esquema.

  Acá van solo las claves y sus etiquetas. Las metas y los horarios NO son
  constantes: viven en la tabla configuracion.
*/

export const GRUPOS = [
  { clave: "cereales", etiqueta: "Cereales", corta: "Cer" },
  { clave: "verduras", etiqueta: "Verduras", corta: "Ver" },
  { clave: "fruta", etiqueta: "Fruta", corta: "Fru" },
  { clave: "proteicos", etiqueta: "Proteicos", corta: "Pro" },
  { clave: "lacteos", etiqueta: "Lácteos", corta: "Lác" },
  { clave: "aceite", etiqueta: "Aceite", corta: "Ace" },
  { clave: "grasas", etiqueta: "Grasas", corta: "Gra" },
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

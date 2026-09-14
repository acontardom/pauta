import type { ClaveGrupo, ClaveTiempo } from "@/lib/dominio";

/*
  Tipos de las tablas, escritos a mano y fieles a supabase/migrations.
  Todo cambio de esquema se refleja aquí en la misma tarea.

  Las fechas son strings "YYYY-MM-DD" (ver lib/fechas.ts) y los timestamps,
  strings ISO que entrega Postgres.
*/

/** Porciones por grupo. Las claves ausentes valen 0. */
export type Porciones = Partial<Record<ClaveGrupo, number>>;

/** Horarios de los 5 tiempos de comida, en "HH:MM". */
export type Horarios = Partial<Record<ClaveTiempo, string>>;

type Comun = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Configuracion = Comun & {
  metas_porciones: Porciones;
  meta_agua_ml: number | null;
  meta_pct_grasa: number | null;
  meta_peso: number | null;
  meta_cintura: number | null;
  horarios: Horarios | null;
  fecha_operacion: string | null;
  fecha_retorno: string | null;
};

export type EstadoTobillo = "mejor" | "igual" | "peor";

export type Dia = Comun & {
  fecha: string;
  agua_ml: number;
  /** Calorías gastadas en actividad. */
  kcal_activas: number | null;
  estado_tobillo: EstadoTobillo | null;
  entrenamiento: string[];
  entrenamiento_minutos: number | null;
  cerrado: boolean;
  nota: string | null;
};

export type Menu = Comun & {
  nombre: string;
  tiempo: ClaveTiempo;
  ingredientes: string[];
  observacion: string | null;
  porciones: Porciones;
  /** Calorías que aporta el menú. */
  kcal: number | null;
};

export type ModoComida = "menu" | "manual" | "fuera";

/*
  Una comida PENDIENTE es la ausencia de fila.
  Completa = modo "menu" o "manual". Estimada = modo "fuera".
  Al registrar desde un menú se COPIAN nombre_menu, porciones y kcal, para que
  la comida conserve su contenido aunque el menú cambie o se borre.
*/
export type Comida = Comun & {
  fecha: string;
  tiempo: ClaveTiempo;
  modo: ModoComida;
  menu_id: string | null;
  nombre_menu: string | null;
  texto_libre: string | null;
  porciones: Porciones;
  kcal: number | null;
};

export type Alimento = Comun & {
  nombre: string;
  grupo: ClaveGrupo;
  medida_casera: string;
  gramos: number | null;
  orden: number;
};

export type Medida = Comun & {
  fecha: string;
  peso: number | null;
  cintura: number | null;
};

export type Inbody = Comun & {
  fecha: string;
  peso: number | null;
  masa_grasa: number | null;
  pct_grasa: number | null;
  masa_musculoesqueletica: number | null;
  masa_libre_grasa: number | null;
  agua_total: number | null;
};

/** Un cambio de fecha planificada de un hito. */
export type CambioHito = {
  desde: string | null;
  hasta: string | null;
  motivo: string | null;
  fecha_cambio: string;
};

export type Hito = Comun & {
  clave: string | null;
  nombre: string;
  fecha_planificada: string | null;
  fecha_real: string | null;
  cumplido: boolean;
  fijo: boolean;
  historial: CambioHito[];
};

export type TipoEntrada = "control" | "kine" | "nota";
export type Hinchazon = "menos" | "igual" | "mas";

export type EntradaRecuperacion = Comun & {
  fecha: string;
  tipo: TipoEntrada;
  numero_sesion: number | null;
  autorizado: string[];
  hinchazon: Hinchazon | null;
  /** Lo que indica la doctora. Solo en tipo "control". */
  indicaciones: string | null;
  /** Lo que anoto yo. */
  nota: string | null;
  proximo_control: string | null;
};

export type PreguntaControl = Comun & {
  texto: string;
  preguntada: boolean;
};

/** Un ejercicio de una rutina. Solo nombre, series y reps son obligatorios. */
export type Ejercicio = {
  orden?: number | null;
  nombre: string;
  series: number;
  /** Texto: "8-12", "10 por lado", "30 seg por lado". */
  reps: string;
  descanso_seg?: number | null;
  notas?: string | null;
};

/*
  Una sesión tipo de un bloque de entrenamiento. dias.entrenamiento no apunta
  acá: guarda el texto de la etiqueta ("Sesión A").
*/
export type Rutina = Comun & {
  /** Nombre del plan. */
  bloque: string;
  /** "A", "B". */
  clave: string;
  nombre: string;
  orden: number;
  activa: boolean;
  /** Reglas del bloque: RIR, progresión, posición. */
  nota: string | null;
  ejercicios: Ejercicio[];
};

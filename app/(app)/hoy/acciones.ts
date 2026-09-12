"use server";

import { revalidatePath } from "next/cache";
import { limpiarPorciones, porcionesVacias } from "@/lib/porciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { ModoComida, Porciones } from "@/lib/supabase/tipos";
import { validarComida, validarDia, type EntradaDia } from "@/lib/validarComida";

export type Respuesta = { ok: true } | { ok: false; error: string };

export type DatosGuardar = {
  fecha: string;
  tiempo: string;
  modo: ModoComida;
  menu_id?: string | null;
  porciones?: Porciones | null;
  texto_libre?: string | null;
  kcal?: number | null;
};

/** El user_id sale de la sesión del servidor, nunca de lo que manda el cliente. */
async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function guardarComida(datos: DatosGuardar): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarComida({
    fecha: datos.fecha,
    tiempo: datos.tiempo,
    porciones: datos.porciones,
    kcal: datos.kcal,
    texto: datos.texto_libre,
  });
  if (!validacion.ok) return validacion;

  const base = {
    user_id: user.id,
    fecha: datos.fecha,
    tiempo: datos.tiempo,
  };

  let fila: Record<string, unknown>;

  if (datos.modo === "menu") {
    if (!datos.menu_id) return { ok: false, error: "Falta el menú" };

    /*
      El contenido del menú se lee de la base, NO de lo que manda el cliente:
      así la comida guarda lo que el menú decía en este momento. Se copia
      nombre, porciones y kcal, de modo que editar o borrar el menú después
      no cambia lo que ya quedó registrado.
    */
    const { data: menu, error } = await supabase
      .from("menus")
      .select("id, nombre, porciones, kcal")
      .eq("id", datos.menu_id)
      .maybeSingle();

    if (error) return { ok: false, error: "No se pudo leer el menú" };
    if (!menu) return { ok: false, error: "Ese menú ya no existe" };

    fila = {
      ...base,
      modo: "menu",
      menu_id: menu.id,
      nombre_menu: menu.nombre,
      porciones: limpiarPorciones(menu.porciones as Porciones),
      kcal: menu.kcal,
      texto_libre: null,
    };
  } else if (datos.modo === "manual") {
    const porciones = limpiarPorciones(datos.porciones);
    if (porcionesVacias(porciones)) {
      return { ok: false, error: "Marca al menos una porción" };
    }
    fila = {
      ...base,
      modo: "manual",
      menu_id: null,
      nombre_menu: null,
      texto_libre: null,
      porciones,
      kcal: datos.kcal ?? null,
    };
  } else if (datos.modo === "fuera") {
    // Estimada: las porciones pueden quedar vacías. Comer fuera se registra
    // igual, aunque no se sepa qué se comió.
    const texto = datos.texto_libre?.trim();
    fila = {
      ...base,
      modo: "fuera",
      menu_id: null,
      nombre_menu: null,
      texto_libre: texto && texto.length > 0 ? texto : "Comí fuera",
      porciones: limpiarPorciones(datos.porciones),
      kcal: datos.kcal ?? null,
    };
  } else {
    return { ok: false, error: "Modo de registro no válido" };
  }

  const { error } = await supabase
    .from("comidas")
    .upsert(fila, { onConflict: "user_id,fecha,tiempo" });

  if (error) return { ok: false, error: "No se pudo guardar la comida" };

  revalidatePath("/hoy");
  return { ok: true };
}

export async function borrarComida(
  fecha: string,
  tiempo: string,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarComida({ fecha, tiempo });
  if (!validacion.ok) return validacion;

  // Borrar la fila devuelve la comida a pendiente: pendiente es la ausencia.
  const { error } = await supabase
    .from("comidas")
    .delete()
    .eq("user_id", user.id)
    .eq("fecha", fecha)
    .eq("tiempo", tiempo);

  if (error) return { ok: false, error: "No se pudo borrar la comida" };

  revalidatePath("/hoy");
  return { ok: true };
}

/* ------------------------------------------------------------------------- */
/* El resto del día: tabla dias                                              */
/* ------------------------------------------------------------------------- */

/*
  La fila de dias se crea recién con el primer dato del día (agua, kcal,
  entrenamiento, tobillo) o al cerrarlo. Registrar solo comidas NO la crea:
  un día con comidas y nada más no tiene por qué existir en dias.

  Por eso todo pasa por upsert: no hace falta saber si la fila ya estaba.
*/
async function upsertDia(
  fecha: string,
  campos: Record<string, unknown>,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarDia(fecha, campos as EntradaDia);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("dias")
    .upsert(
      { user_id: user.id, fecha, ...campos },
      { onConflict: "user_id,fecha" },
    );

  if (error) return { ok: false, error: "No se pudo guardar el día" };

  revalidatePath("/hoy");
  return { ok: true };
}

/** Guarda solo los campos enviados; el resto de la fila queda como estaba. */
export async function guardarDia(
  fecha: string,
  campos: EntradaDia,
): Promise<Respuesta> {
  return upsertDia(fecha, campos as Record<string, unknown>);
}

/*
  Cerrar el día es un REGISTRO, no una evaluación: se puede cerrar con comidas
  pendientes y el día cuenta igual como día registrado.
*/
export async function cerrarDia(fecha: string): Promise<Respuesta> {
  return upsertDia(fecha, { cerrado: true });
}

export async function reabrirDia(fecha: string): Promise<Respuesta> {
  return upsertDia(fecha, { cerrado: false });
}

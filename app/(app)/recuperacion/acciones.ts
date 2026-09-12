"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { validarEntrada, type EntradaFormulario } from "@/lib/validarEntrada";
import { validarHito, type HitoFormulario } from "@/lib/validarHito";
import { validarPregunta } from "@/lib/validarPregunta";

export type Respuesta = { ok: true } | { ok: false; error: string };

/** El user_id sale de la sesión del servidor, nunca de lo que manda el cliente. */
async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/* ------------------------------------------------------------------------- */
/* Preguntas                                                                 */
/* ------------------------------------------------------------------------- */

export async function agregarPregunta(texto: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarPregunta(texto);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("preguntas_control")
    .insert({ user_id: user.id, texto: validacion.texto });

  if (error) return { ok: false, error: "No se pudo guardar la pregunta" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

/*
  Recibe el valor final y no un "invertir": si dos toques se cruzan en camino
  al servidor, el último que llega deja el estado que se ve, en vez de
  deshacer el anterior.
*/
export async function alternarPregunta(
  id: string,
  preguntada: boolean,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("preguntas_control")
    .update({ preguntada })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar la pregunta" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

export async function eliminarPregunta(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("preguntas_control")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo quitar la pregunta" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

/* ------------------------------------------------------------------------- */
/* Entradas: kinesiología, controles y notas                                 */
/* ------------------------------------------------------------------------- */

export async function guardarEntrada(
  datos: EntradaFormulario,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarEntrada(datos);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("entradas_recuperacion")
    .insert({ user_id: user.id, ...validacion.entrada });

  if (error) return { ok: false, error: "No se pudo guardar el registro" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

export async function actualizarEntrada(
  id: string,
  datos: EntradaFormulario,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarEntrada(datos);
  if (!validacion.ok) return validacion;

  // El tipo no cambia al editar: se compara con lo guardado, no con el cliente.
  const { data: actual, error: errorLectura } = await supabase
    .from("entradas_recuperacion")
    .select("tipo")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (errorLectura) return { ok: false, error: "No se pudo leer el registro" };
  if (!actual) return { ok: false, error: "Ese registro ya no existe" };
  if (actual.tipo !== validacion.entrada.tipo) {
    return { ok: false, error: "El tipo de un registro no se puede cambiar" };
  }

  const { error } = await supabase
    .from("entradas_recuperacion")
    .update(validacion.entrada)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar el registro" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

export async function eliminarEntrada(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("entradas_recuperacion")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo eliminar el registro" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

/* ------------------------------------------------------------------------- */
/* Hitos                                                                     */
/* ------------------------------------------------------------------------- */

export async function guardarHito(datos: HitoFormulario): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarHito(datos, null);
  if (!validacion.ok) return validacion;

  // Un hito creado desde la app no es fijo y no tiene clave: se puede eliminar.
  const { error } = await supabase
    .from("hitos")
    .insert({ user_id: user.id, clave: null, fijo: false, ...validacion.hito });

  if (error) return { ok: false, error: "No se pudo guardar el hito" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

/*
  El historial se extiende a partir del hito como está EN LA BASE, no del que
  tiene abierto el formulario. Así, aunque el formulario llegue con datos
  viejos, un guardado nunca borra un cambio de fecha ya registrado.
*/
export async function actualizarHito(
  id: string,
  datos: HitoFormulario,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: anterior, error: errorLectura } = await supabase
    .from("hitos")
    .select("fecha_planificada, historial")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (errorLectura) return { ok: false, error: "No se pudo leer el hito" };
  if (!anterior) return { ok: false, error: "Ese hito ya no existe" };

  const validacion = validarHito(datos, anterior);
  if (!validacion.ok) return validacion;

  // clave y fijo no se tocan: un hito de la semilla sigue siendo fijo.
  const { error } = await supabase
    .from("hitos")
    .update(validacion.hito)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar el hito" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

export async function eliminarHito(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  // Se revisa en el servidor: que la hoja no muestre el botón no alcanza.
  const { data: hito, error: errorLectura } = await supabase
    .from("hitos")
    .select("fijo")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (errorLectura) return { ok: false, error: "No se pudo leer el hito" };
  if (!hito) return { ok: false, error: "Ese hito ya no existe" };
  if (hito.fijo) {
    return { ok: false, error: "Los hitos fijos no se pueden eliminar" };
  }

  const { error } = await supabase
    .from("hitos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo eliminar el hito" };

  revalidatePath("/recuperacion");
  return { ok: true };
}

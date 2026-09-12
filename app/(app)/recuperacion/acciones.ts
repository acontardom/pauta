"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
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

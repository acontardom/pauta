"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { validarInbody, type EntradaInbody } from "@/lib/validarInbody";
import { validarMedida, type EntradaMedida } from "@/lib/validarMedida";

export type Respuesta = { ok: true } | { ok: false; error: string };

/** El user_id sale de la sesión del servidor, nunca de lo que manda el cliente. */
async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/*
  Se permiten VARIOS registros en la misma fecha, así que esto es un insert y
  no un upsert por fecha: pesarse dos veces el mismo día son dos datos, y el
  segundo no tiene por qué borrar el primero.
*/
export async function guardarMedida(
  entrada: EntradaMedida,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarMedida(entrada);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("medidas")
    .insert({ user_id: user.id, ...validacion.medida });

  if (error) return { ok: false, error: "No se pudo guardar el registro" };

  revalidatePath("/progreso");
  return { ok: true };
}

export async function actualizarMedida(
  id: string,
  entrada: EntradaMedida,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarMedida(entrada);
  if (!validacion.ok) return validacion;

  // El filtro por user_id es redundante con RLS, y va igual.
  const { error } = await supabase
    .from("medidas")
    .update(validacion.medida)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar el registro" };

  revalidatePath("/progreso");
  return { ok: true };
}

export async function eliminarMedida(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("medidas")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo eliminar el registro" };

  revalidatePath("/progreso");
  return { ok: true };
}

/* ------------------------------------------------------------------------- */
/* InBody                                                                    */
/* ------------------------------------------------------------------------- */

/*
  Igual que medidas: se permiten varias mediciones en la misma fecha, así que
  es un insert y no un upsert.

  La tarjeta de % de grasa lee de esta misma tabla, así que revalidar
  /progreso basta para que refleje una medición nueva.
*/
export async function guardarInbody(entrada: EntradaInbody): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarInbody(entrada);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("inbody")
    .insert({ user_id: user.id, ...validacion.medicion });

  if (error) return { ok: false, error: "No se pudo guardar la medición" };

  revalidatePath("/progreso");
  return { ok: true };
}

export async function actualizarInbody(
  id: string,
  entrada: EntradaInbody,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarInbody(entrada);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("inbody")
    .update(validacion.medicion)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar la medición" };

  revalidatePath("/progreso");
  return { ok: true };
}

export async function eliminarInbody(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("inbody")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo eliminar la medición" };

  revalidatePath("/progreso");
  return { ok: true };
}


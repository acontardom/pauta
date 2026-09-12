"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { validarMenu, type EntradaMenu } from "@/lib/validarMenu";

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
  Hoy lista los menús en su hoja de registro, así que cualquier cambio acá
  también invalida /hoy. Sin eso, un menú nuevo no aparecería al registrar una
  comida hasta la próxima recarga completa.
*/
function revalidar() {
  revalidatePath("/menus");
  revalidatePath("/hoy");
}

export async function crearMenu(entrada: EntradaMenu): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarMenu(entrada);
  if (!validacion.ok) return validacion;

  const { error } = await supabase
    .from("menus")
    .insert({ user_id: user.id, ...validacion.menu });

  if (error) return { ok: false, error: "No se pudo crear el menú" };

  revalidar();
  return { ok: true };
}

export async function actualizarMenu(
  id: string,
  entrada: EntradaMenu,
): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const validacion = validarMenu(entrada);
  if (!validacion.ok) return validacion;

  // El filtro por user_id es redundante con RLS, y va igual: si algún día
  // cambia una política, esto no se convierte en un agujero.
  const { error } = await supabase
    .from("menus")
    .update(validacion.menu)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar el menú" };

  revalidar();
  return { ok: true };
}

/*
  Eliminar un menú NO toca las comidas ya registradas.

  La comida guarda su propia copia de nombre_menu, porciones y kcal, y el
  esquema deja menu_id en null (on delete set null). Un día ya cerrado no
  puede cambiar porque después se editó o se borró un menú.
*/
export async function eliminarMenu(id: string): Promise<Respuesta> {
  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "No se pudo eliminar el menú" };

  revalidar();
  return { ok: true };
}

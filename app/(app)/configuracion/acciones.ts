"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  validarConfiguracion,
  type ConfiguracionFormulario,
  type ErrorCampo,
} from "@/lib/validarConfiguracion";

export type RespuestaConfiguracion =
  | { ok: true }
  | { ok: false; errores: ErrorCampo[] };

/*
  Estas pantallas leen la configuración, así que todas se revalidan: una meta
  nueva tiene que verse en los contadores de Hoy y en la grilla de Semana sin
  esperar a una recarga completa.
*/
const PANTALLAS_QUE_LA_USAN = [
  "/configuracion",
  "/hoy",
  "/semana",
  "/progreso",
  "/recuperacion",
];

export async function guardarConfiguracion(
  formulario: ConfiguracionFormulario,
): Promise<RespuestaConfiguracion> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errores: [{ campo: "", mensaje: "Sesión expirada", detalle: "" }] };
  }

  // Se valida de nuevo en el servidor: lo que manda el cliente no se confía.
  const validacion = validarConfiguracion(formulario);
  if (!validacion.ok) return validacion;

  // Upsert sobre user_id: crea la fila si todavía no existe.
  const { error } = await supabase
    .from("configuracion")
    .upsert(
      { user_id: user.id, ...validacion.configuracion },
      { onConflict: "user_id" },
    );

  if (error) {
    return {
      ok: false,
      errores: [
        {
          campo: "",
          mensaje: "No se pudo guardar la configuración. Intenta de nuevo.",
          detalle: "",
        },
      ],
    };
  }

  for (const ruta of PANTALLAS_QUE_LA_USAN) revalidatePath(ruta);
  return { ok: true };
}

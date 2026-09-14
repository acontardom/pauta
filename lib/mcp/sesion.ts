import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Sesión de Supabase del endpoint MCP.

  El endpoint no tiene cookies: inicia sesión como el único usuario, con
  EMAIL_PERMITIDO y MCP_PASSWORD. Así cada consulta va con un JWT real de ese
  usuario y RLS filtra por su user_id igual que en la app. No usa la clave
  secreta (que salta RLS y nunca va a Vercel).

  La sesión se guarda en memoria mientras la instancia de la función siga viva,
  para no iniciar sesión en cada petición (Supabase limita los inicios de
  sesión por IP). getSession() la refresca sola cuando vence; si el refresco
  falla, se vuelve a iniciar sesión.
*/

export type SesionMcp = { supabase: SupabaseClient; userId: string };

/** Falta una variable de entorno o las credenciales no sirven. */
export class ErrorSesionMcp extends Error {}

let enCurso: Promise<SesionMcp> | null = null;

export async function sesionMcp(): Promise<SesionMcp> {
  if (enCurso) {
    try {
      const sesion = await enCurso;
      const { data, error } = await sesion.supabase.auth.getSession();
      if (!error && data.session) return sesion;
    } catch {
      // Se reintenta abajo con un inicio de sesión nuevo.
    }
  }

  enCurso = iniciarSesion();
  try {
    return await enCurso;
  } catch (e) {
    enCurso = null;
    throw e;
  }
}

async function iniciarSesion(): Promise<SesionMcp> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const correo = process.env.EMAIL_PERMITIDO?.trim();
  const password = process.env.MCP_PASSWORD;

  if (!url || !clave) {
    throw new ErrorSesionMcp("Faltan las variables de Supabase en el servidor.");
  }
  if (!correo || !password) {
    throw new ErrorSesionMcp(
      "El servidor MCP no está configurado: faltan EMAIL_PERMITIDO o MCP_PASSWORD.",
    );
  }

  const supabase = createClient(url, clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });
  if (error || !data.user) {
    throw new ErrorSesionMcp(
      "No se pudo iniciar sesión en Supabase: revisa MCP_PASSWORD en Vercel.",
    );
  }
  if (data.user.email?.trim().toLowerCase() !== correo.toLowerCase()) {
    throw new ErrorSesionMcp("La sesión no corresponde al correo permitido.");
  }

  return { supabase, userId: data.user.id };
}

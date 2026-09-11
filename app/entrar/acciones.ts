"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado = { ok: true } | { ok: false; error: string };

/** Normaliza un correo para comparar: sin espacios y en minúsculas. */
function normalizar(email: string) {
  return email.trim().toLowerCase();
}

/*
  El acceso está restringido a un solo correo. La comparación ocurre SOLO en el
  servidor: EMAIL_PERMITIDO no lleva prefijo NEXT_PUBLIC_ y nunca llega al
  cliente. Si el correo no calza, no se llama a Supabase, así que no se envía
  ningún correo ni se crea ningún usuario.
*/
function esPermitido(email: string) {
  const permitido = process.env.EMAIL_PERMITIDO?.trim().toLowerCase();
  return Boolean(permitido) && email === permitido;
}

/** Origen de la request, para armar el emailRedirectTo del enlace del correo. */
async function origen() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocolo = h.get("x-forwarded-proto") ?? "https";
  return `${protocolo}://${host}`;
}

export async function enviarCodigo(email: string): Promise<Resultado> {
  const correo = normalizar(email);

  if (!correo) return { ok: false, error: "Escribe tu correo" };
  if (!esPermitido(correo)) {
    return { ok: false, error: "Este correo no tiene acceso" };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: {
      shouldCreateUser: true,
      // Alternativa al código, para cuando entro desde un navegador.
      emailRedirectTo: `${await origen()}/auth/confirmar`,
    },
  });

  if (error) {
    return { ok: false, error: "No pudimos enviar el código. Intenta de nuevo" };
  }
  return { ok: true };
}

export async function verificarCodigo(
  email: string,
  token: string,
): Promise<Resultado> {
  const correo = normalizar(email);
  const codigo = token.trim();

  if (!esPermitido(correo)) {
    return { ok: false, error: "Este correo no tiene acceso" };
  }
  if (!codigo) return { ok: false, error: "Escribe el código" };

  const supabase = await crearClienteServidor();

  /*
    El primer login crea el usuario, y ese correo sale con la plantilla de
    confirmación: su código se verifica con type "signup", no "email". Se
    intenta "email" y, si falla, "signup", para que el primer login funcione
    igual que los siguientes.
  */
  let { error } = await supabase.auth.verifyOtp({
    email: correo,
    token: codigo,
    type: "email",
  });

  if (error) {
    ({ error } = await supabase.auth.verifyOtp({
      email: correo,
      token: codigo,
      type: "signup",
    }));
  }

  if (error) {
    return { ok: false, error: "El código no es válido o expiró" };
  }

  // redirect() lanza: tiene que quedar fuera del try/catch de quien llame.
  redirect("/hoy");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

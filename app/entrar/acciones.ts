"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type Resultado = { ok: false; error: string };

/*
  Login con correo y contraseña.

  Por qué no es por enlace ni por código: en iOS una PWA instalada guarda sus
  cookies en un contenedor separado de Safari, así que el enlace de un correo
  abriría Safari y la app instalada seguiría sin sesión. El código habría
  resuelto eso, pero Supabase no deja personalizar las plantillas de correo en
  plan free con el proveedor por defecto, y las de fábrica no traen el código.
  Con contraseña no hace falta correo en ningún momento: se escribe dentro de
  la app y la sesión queda en su propio contenedor.

  El registro está deshabilitado: el usuario se crea una sola vez desde el
  dashboard de Supabase.
*/

/** El acceso está restringido a un correo, comparado SOLO en el servidor. */
function esPermitido(email: string) {
  const permitido = process.env.EMAIL_PERMITIDO?.trim().toLowerCase();
  return Boolean(permitido) && email === permitido;
}

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<Resultado | void> {
  const correo = email.trim().toLowerCase();

  if (!correo || !password) {
    return { ok: false, error: "Escribe tu correo y tu contraseña" };
  }

  // EMAIL_PERMITIDO no lleva prefijo NEXT_PUBLIC_: nunca llega al cliente.
  if (!esPermitido(correo)) {
    return { ok: false, error: "Este correo no tiene acceso" };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });

  if (error) {
    /*
      Solo "credenciales inválidas" es culpa de lo que se escribió. Cualquier
      otra cosa (proveedor de correo apagado, usuario sin confirmar, rate
      limit) es un problema de configuración, y decir "contraseña incorrecta"
      manda a buscar donde no es. Se separan, y el motivo real queda en los
      logs del servidor.
    */
    if (error.code === "invalid_credentials") {
      return { ok: false, error: "El correo o la contraseña no coinciden" };
    }

    console.error("[entrar] fallo de autenticación:", error.code, error.message);
    return {
      ok: false,
      error: `No se pudo entrar: ${error.message}`,
    };
  }

  // redirect() lanza: va fuera de cualquier try/catch de quien llame.
  redirect("/hoy");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

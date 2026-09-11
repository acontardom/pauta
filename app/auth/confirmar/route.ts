import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/*
  Enlace del correo: la alternativa al código.

  Sirve cuando entro desde un navegador. En la PWA instalada en iOS este enlace
  abriría Safari, que tiene su propio contenedor de cookies, y la app seguiría
  sin sesión: por eso el flujo principal es el código.
*/
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash) {
    const supabase = await crearClienteServidor();

    /*
      Una sola plantilla de correo sirve para magic_link y para confirmation,
      así que el enlace trae siempre type=email. En el primer login el token es
      de tipo "signup": se prueban ambos antes de darlo por vencido.
    */
    const tipos: EmailOtpType[] = type ? [type, "signup", "email"] : ["email", "signup"];

    for (const t of [...new Set(tipos)]) {
      const { error } = await supabase.auth.verifyOtp({
        type: t,
        token_hash: tokenHash,
      });
      if (!error) return NextResponse.redirect(new URL("/hoy", origin));
    }
  }

  const url = new URL("/entrar", origin);
  url.searchParams.set("mensaje", "El enlace expiró, pide un código nuevo");
  return NextResponse.redirect(url);
}

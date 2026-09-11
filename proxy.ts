import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/*
  Proxy (lo que hasta Next 15 se llamaba middleware).

  Hace dos cosas en cada request:
  1. Refresca la sesión de Supabase con el patrón oficial de @supabase/ssr.
  2. Deja pasar solo al correo autorizado.

  Cuidado al tocar este archivo: entre crear el cliente y devolver la respuesta
  no puede haber lógica que corte el flujo sin copiar las cookies, o la sesión
  se pierde de a poco al expirar el token.
*/
export default async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesNuevas) {
          for (const { name, value } of cookiesNuevas) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesNuevas) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() y no getSession(): valida el token contra Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const enEntrar = ruta === "/entrar";

  if (user) {
    const permitido = process.env.EMAIL_PERMITIDO?.trim().toLowerCase();
    const correo = user.email?.trim().toLowerCase();

    // Sesión de otro correo: se cierra y se vuelve a /entrar.
    if (!permitido || correo !== permitido) {
      await supabase.auth.signOut();
      return redirigir(request, "/entrar");
    }

    if (enEntrar) return redirigir(request, "/hoy");
    return respuesta;
  }

  if (!enEntrar) return redirigir(request, "/entrar");
  return respuesta;
}

function redirigir(request: NextRequest, destino: string) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
      Quedan fuera:
      - /entrar : el propio formulario de login.
      - _next/static, _next/image : estáticos del build.
      - manifest.webmanifest, icon, apple-icon, icon-512, favicon.ico :
        iOS los pide SIN sesión al instalar la app. Si pasaran por aquí,
        la PWA se instalaría sin ícono y sin nombre.
      - archivos con extensión (imágenes, fuentes).
    */
    "/((?!entrar|_next/static|_next/image|manifest\.webmanifest|icon|apple-icon|icon-512|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/*
  Cliente de Supabase para Server Components, Server Actions y Route Handlers.

  En un Server Component las cookies son de solo lectura y setAll lanza. Se
  ignora ese error a propósito: ahí la sesión solo se lee, y quien la refresca
  es el proxy (proxy.ts), que sí puede escribir cookies.
*/
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(cookiesNuevas) {
          try {
            for (const { name, value, options } of cookiesNuevas) {
              almacen.set(name, value, options);
            }
          } catch {
            // Server Component: el refresco de sesión lo hace el proxy.
          }
        },
      },
    },
  );
}

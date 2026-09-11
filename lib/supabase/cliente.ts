import { createBrowserClient } from "@supabase/ssr";

/*
  Cliente de Supabase para el navegador.
  La sesión viaja en cookies (no en localStorage), para que el proxy y los
  Server Components puedan leerla en cada request.
*/
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

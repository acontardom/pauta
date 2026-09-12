import Link from "next/link";
import EncabezadoPantalla from "@/components/ui/EncabezadoPantalla";
import Tarjeta from "@/components/ui/Tarjeta";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cerrarSesion } from "@/app/entrar/acciones";
import BotonCerrarSesion from "./BotonCerrarSesion";

/*
  Bloque provisorio: confirma que la sesión y la base responden.
  La tarea 10 reemplaza esta pantalla completa.
*/
export default async function Configuracion() {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Select real contra la base: con RLS y sin filas debe volver sin error.
  const { error } = await supabase.from("configuracion").select("id").limit(1);

  return (
    <>
      <EncabezadoPantalla titulo="Configuración">
        {/*
          El engranaje vive solo en Hoy, así que acá hace falta una vuelta
          explícita. Siempre va a /hoy: no se recuerda la pestaña de origen.
        */}
        <Link
          href="/hoy"
          className="mt-2 inline-block text-[13px] text-verde"
        >
          ‹ Volver a Hoy
        </Link>
      </EncabezadoPantalla>

      <div className="flex flex-col gap-3 px-5 pt-5">
        <Tarjeta>
          <p className="text-[12.5px] text-tinta-3">Sesión iniciada como</p>
          <p className="mt-1 text-[15.5px] text-tinta">{user?.email}</p>
          <p className="mt-3 border-t border-linea pt-3 text-[13.5px] text-tinta-2">
            {error ? `Error de base de datos: ${error.message}` : "Base de datos conectada"}
          </p>
        </Tarjeta>

        <form action={cerrarSesion}>
          <BotonCerrarSesion />
        </form>

        <p className="pt-2 text-[13px] text-tinta-4">En construcción</p>
      </div>
    </>
  );
}

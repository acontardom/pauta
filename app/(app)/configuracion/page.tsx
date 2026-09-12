import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  formularioDesdeConfiguracion,
  type FilaConfiguracion,
} from "@/lib/validarConfiguracion";
import FormularioConfiguracion from "./FormularioConfiguracion";

export default async function PaginaConfiguracion() {
  const supabase = await crearClienteServidor();

  const [sesion, fila] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("configuracion")
      .select(
        "metas_porciones, meta_agua_ml, meta_pct_grasa, meta_peso, meta_cintura, horarios, fecha_operacion, fecha_retorno",
      )
      .maybeSingle(),
  ]);

  /*
    Si la lectura FALLA no se muestra el formulario. Sin esto, un error se vería
    igual que "todavía no hay configuración": aparecerían los valores por
    defecto, y guardar pisaría la configuración real con ellos.
  */
  if (fila.error) {
    return (
      <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
        <h1 className="font-serif text-[27px] font-medium text-tinta">
          Configuración
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-tinta-2">
          No se pudo cargar la configuración. Recarga la pantalla para intentar
          de nuevo.
        </p>
        <Link href="/hoy" className="mt-2 inline-block text-[14px] text-verde">
          ‹ Volver a Hoy
        </Link>
      </div>
    );
  }

  const existe = fila.data !== null;

  return (
    <FormularioConfiguracion
      inicial={formularioDesdeConfiguracion(
        (fila.data ?? null) as FilaConfiguracion | null,
      )}
      existe={existe}
      correo={sesion.data.user?.email ?? ""}
    />
  );
}

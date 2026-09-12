import { hoyChile } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Configuracion, Inbody, Medida } from "@/lib/supabase/tipos";
import PantallaProgreso from "./PantallaProgreso";

export default async function Progreso() {
  const supabase = await crearClienteServidor();

  const [configuracion, medidas, inbody] = await Promise.all([
    supabase
      .from("configuracion")
      .select("meta_peso, meta_cintura, meta_pct_grasa")
      .maybeSingle(),
    supabase.from("medidas").select("*").order("fecha"),
    // De inbody, esta pantalla solo usa el % de grasa. El resto es la tarea 8b.
    supabase.from("inbody").select("fecha, pct_grasa").order("fecha"),
  ]);

  return (
    <PantallaProgreso
      configuracion={
        (configuracion.data ?? {
          meta_peso: null,
          meta_cintura: null,
          meta_pct_grasa: null,
        }) as Pick<
          Configuracion,
          "meta_peso" | "meta_cintura" | "meta_pct_grasa"
        >
      }
      medidas={(medidas.data ?? []) as Medida[]}
      inbody={(inbody.data ?? []) as Pick<Inbody, "fecha" | "pct_grasa">[]}
      hoy={hoyChile()}
    />
  );
}

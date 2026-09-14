import { redirect } from "next/navigation";
import EncabezadoPantalla from "@/components/ui/EncabezadoPantalla";
import { hoyChile } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type {
  Alimento,
  Comida,
  Configuracion,
  Menu,
} from "@/lib/supabase/tipos";
import type { RutinaHoja } from "./HojaRutina";
import PantallaHoy, { type DiaVista } from "./PantallaHoy";

/** "YYYY-MM-DD" que además existe en el calendario. */
function fechaValida(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

export default async function Hoy({ searchParams }: PageProps<"/hoy">) {
  const { fecha: parametro } = await searchParams;
  const hoy = hoyChile();

  // Una fecha inválida o futura no es un error que valga mostrar: se vuelve a hoy.
  if (typeof parametro === "string") {
    if (!fechaValida(parametro) || parametro > hoy) redirect("/hoy");
  }
  const fecha = typeof parametro === "string" ? parametro : hoy;

  const supabase = await crearClienteServidor();

  // En paralelo: la latencia a São Paulo se paga una vez, no seis.
  const [configuracion, comidas, dia, menus, alimentos, rutinas] = await Promise.all([
    supabase
      .from("configuracion")
      .select("metas_porciones, horarios, meta_agua_ml")
      .maybeSingle(),
    supabase.from("comidas").select("*").eq("fecha", fecha),
    // Puede no existir: la fila se crea con el primer dato del día.
    supabase
      .from("dias")
      .select(
        "agua_ml, kcal_activas, entrenamiento, entrenamiento_minutos, estado_tobillo, cerrado",
      )
      .eq("fecha", fecha)
      .maybeSingle(),
    supabase.from("menus").select("*").order("nombre"),
    supabase.from("alimentos").select("*").order("grupo").order("orden"),
    // Solo las activas: dan los chips de sesión y las pestañas de la hoja.
    supabase
      .from("rutinas")
      .select("id, bloque, clave, nombre, nota, ejercicios")
      .eq("activa", true)
      .order("orden")
      .order("clave"),
  ]);

  if (!configuracion.data) {
    return (
      <>
        <EncabezadoPantalla titulo="Hoy" />
        <p className="px-5 pt-6 text-[14.5px] leading-relaxed text-tinta-2">
          Falta la configuración inicial.
        </p>
      </>
    );
  }

  return (
    <PantallaHoy
      fecha={fecha}
      hoy={hoy}
      configuracion={configuracion.data as Pick<
        Configuracion,
        "metas_porciones" | "horarios" | "meta_agua_ml"
      >}
      comidas={(comidas.data ?? []) as Comida[]}
      dia={(dia.data ?? null) as DiaVista | null}
      menus={(menus.data ?? []) as Menu[]}
      alimentos={(alimentos.data ?? []) as Alimento[]}
      rutinas={(rutinas.data ?? []) as RutinaHoja[]}
    />
  );
}

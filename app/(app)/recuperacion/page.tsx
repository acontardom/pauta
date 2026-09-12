import Link from "next/link";
import { hoyChile, sumarDias } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type {
  Dia,
  EntradaRecuperacion,
  Hito,
  PreguntaControl,
} from "@/lib/supabase/tipos";
import PantallaRecuperacion from "./PantallaRecuperacion";

export default async function Recuperacion() {
  const hoy = hoyChile();
  const desde = sumarDias(hoy, -29);
  const supabase = await crearClienteServidor();

  const [configuracion, entradas, dias, preguntas, hitos] = await Promise.all([
    supabase
      .from("configuracion")
      .select("fecha_operacion, fecha_retorno")
      .maybeSingle(),
    supabase
      .from("entradas_recuperacion")
      .select("*")
      .order("fecha")
      .order("created_at"),
    // Solo los últimos 30 días: es todo lo que muestra la franja del tobillo.
    supabase
      .from("dias")
      .select("fecha, estado_tobillo, entrenamiento")
      .gte("fecha", desde)
      .lte("fecha", hoy),
    supabase.from("preguntas_control").select("*"),
    // Las marcas de la barra de avance salen de los hitos con fecha planificada.
    supabase
      .from("hitos")
      .select("fecha_planificada, cumplido")
      .not("fecha_planificada", "is", null),
  ]);

  const fechaOperacion = configuracion.data?.fecha_operacion;
  const fechaRetorno = configuracion.data?.fecha_retorno;

  if (!fechaOperacion || !fechaRetorno) {
    return (
      <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
        <h1 className="font-serif text-[27px] font-medium text-tinta">
          Recuperación
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-tinta-2">
          Falta la fecha de operación o la de retorno para calcular el avance.
        </p>
        <Link
          href="/configuracion"
          className="mt-2 inline-block text-[14px] text-verde"
        >
          Completarlas en Configuración
        </Link>
      </div>
    );
  }

  return (
    <PantallaRecuperacion
      hoy={hoy}
      fechaOperacion={fechaOperacion}
      fechaRetorno={fechaRetorno}
      entradas={(entradas.data ?? []) as EntradaRecuperacion[]}
      dias={(dias.data ?? []) as Pick<Dia, "fecha" | "estado_tobillo" | "entrenamiento">[]}
      preguntas={(preguntas.data ?? []) as PreguntaControl[]}
      hitos={(hitos.data ?? []) as Pick<Hito, "fecha_planificada" | "cumplido">[]}
    />
  );
}

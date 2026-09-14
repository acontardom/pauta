import EncabezadoPantalla from "@/components/ui/EncabezadoPantalla";
import { hoyChile, sumarDias } from "@/lib/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Comida, Configuracion } from "@/lib/supabase/tipos";
import {
  construirSemana,
  observaciones,
  promedios,
  type ConfigSemana,
  type DiaSemanaFila,
} from "@/lib/semana";
import PantallaSemana from "./PantallaSemana";

export default async function Semana() {
  // Siete días móviles que terminan hoy. No es de lunes a domingo.
  const hoy = hoyChile();
  const desde = sumarDias(hoy, -6);
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));

  const supabase = await crearClienteServidor();

  /*
    Una consulta por tabla para todo el rango, no una por día: siete viajes a
    São Paulo por pantalla se notan, y además el filtro por rango lo resuelve
    el índice (user_id, fecha) que ya existe.
  */
  const [configuracion, dias, comidas] = await Promise.all([
    supabase
      .from("configuracion")
      .select("metas_porciones, meta_agua_ml")
      .maybeSingle(),
    supabase
      .from("dias")
      .select("fecha, agua_ml, kcal_activas, entrenamiento, estado_tobillo, cerrado")
      .gte("fecha", desde)
      .lte("fecha", hoy),
    supabase
      .from("comidas")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hoy),
  ]);

  if (!configuracion.data) {
    return (
      <>
        <EncabezadoPantalla titulo="Semana" />
        <p className="px-5 pt-6 text-[14.5px] leading-relaxed text-tinta-2">
          Falta la configuración inicial.
        </p>
      </>
    );
  }

  const config: ConfigSemana = configuracion.data as Pick<
    Configuracion,
    "metas_porciones" | "meta_agua_ml"
  >;
  const filas = (dias.data ?? []) as DiaSemanaFila[];

  const semana = construirSemana(
    fechas,
    filas,
    (comidas.data ?? []) as Comida[],
    config,
  );

  return (
    <PantallaSemana
      semana={semana}
      promedios={promedios(filas)}
      observaciones={observaciones(semana, config)}
    />
  );
}

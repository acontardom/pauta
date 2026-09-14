import type { ClaveTiempo } from "@/lib/dominio";
import type { Comida, Menu } from "@/lib/supabase/tipos";
import type { ConfigPauta, DiaPauta, FilaComida, Repositorio } from "./pauta";
import type { SesionMcp } from "./sesion";

/*
  Acceso a Supabase para el endpoint MCP.

  El cliente viene con la sesión del usuario (ver sesion.ts), así que RLS
  limita todas las lecturas y escrituras a su user_id. El user_id que va en los
  upsert sale de esa misma sesión, nunca de lo que manda Claude.
*/
export function crearRepositorio({ supabase, userId }: SesionMcp): Repositorio {
  return {
    async configuracion() {
      const { data, error } = await supabase
        .from("configuracion")
        .select("metas_porciones, meta_agua_ml")
        .maybeSingle();
      if (error) throw new Error("No se pudo leer la configuración.");
      return (data ?? null) as ConfigPauta | null;
    },

    async comidas(desde, hasta) {
      const { data, error } = await supabase
        .from("comidas")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta);
      if (error) throw new Error("No se pudieron leer las comidas.");
      return (data ?? []) as Comida[];
    },

    async dias(desde, hasta) {
      const { data, error } = await supabase
        .from("dias")
        .select(
          "fecha, agua_ml, kcal_activas, entrenamiento, estado_tobillo, cerrado",
        )
        .gte("fecha", desde)
        .lte("fecha", hasta);
      if (error) throw new Error("No se pudieron leer los días.");
      return (data ?? []) as DiaPauta[];
    },

    async menus(tiempo?: ClaveTiempo) {
      let consulta = supabase.from("menus").select("*").order("nombre");
      if (tiempo) consulta = consulta.eq("tiempo", tiempo);
      const { data, error } = await consulta;
      if (error) throw new Error("No se pudieron leer los menús.");
      return (data ?? []) as Menu[];
    },

    async menu(id) {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error("No se pudo leer el menú.");
      return (data ?? null) as Menu | null;
    },

    async guardarComida(fila: FilaComida) {
      // Una fila por (fecha, tiempo): el upsert reemplaza lo que hubiera.
      const { error } = await supabase
        .from("comidas")
        .upsert({ user_id: userId, ...fila }, { onConflict: "user_id,fecha,tiempo" });
      if (error) throw new Error("No se pudo guardar la comida.");
    },

    async guardarAgua(fecha, aguaMl) {
      // Crea la fila de dias si todavía no existe, como el primer dato en Hoy.
      const { error } = await supabase
        .from("dias")
        .upsert(
          { user_id: userId, fecha, agua_ml: aguaMl },
          { onConflict: "user_id,fecha" },
        );
      if (error) throw new Error("No se pudo guardar el agua.");
    },
  };
}

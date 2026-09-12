import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Menu } from "@/lib/supabase/tipos";
import PantallaMenus from "./PantallaMenus";

export default async function Menus() {
  const supabase = await crearClienteServidor();

  // El orden alfabético se pide a Postgres; el agrupado por tiempo se arma
  // en el cliente, siguiendo el orden de TIEMPOS.
  const { data } = await supabase.from("menus").select("*").order("nombre");

  return <PantallaMenus menus={(data ?? []) as Menu[]} />;
}

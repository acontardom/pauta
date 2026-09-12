"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estadoComida, totalesDia } from "@/lib/dia";
import { TIEMPOS, type ClaveTiempo } from "@/lib/dominio";
import { sumarDias } from "@/lib/fechas";
import { limpiarPorciones } from "@/lib/porciones";
import type {
  Alimento,
  Comida,
  Configuracion,
  Menu,
  Porciones,
} from "@/lib/supabase/tipos";
import { borrarComida, guardarComida } from "./acciones";
import EncabezadoHoy from "./EncabezadoHoy";
import HojaComida from "./HojaComida";
import TarjetaComida from "./TarjetaComida";

type Props = {
  fecha: string;
  hoy: string;
  configuracion: Pick<Configuracion, "metas_porciones" | "horarios">;
  comidas: Comida[];
  menus: Menu[];
  alimentos: Alimento[];
};

type Accion =
  | { tipo: "guardar"; comida: Comida }
  | { tipo: "borrar"; tiempo: string };

const AVISO_FALLO = "No se pudo guardar. Intenta de nuevo.";

export default function PantallaHoy({
  fecha,
  hoy,
  configuracion,
  comidas,
  menus,
  alimentos,
}: Props) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [abierta, setAbierta] = useState<ClaveTiempo | null>(null);
  const [aviso, setAviso] = useState("");

  /*
    La tarjeta y los contadores se actualizan antes de que el servidor
    responda: registrar una comida tiene que sentirse instantáneo. Si la acción
    falla, React descarta este estado y vuelve al del servidor; el aviso
    explica por qué las cosas volvieron atrás.
  */
  const [comidasVista, aplicar] = useOptimistic(
    comidas,
    (estado: Comida[], accion: Accion) => {
      if (accion.tipo === "borrar") {
        return estado.filter((c) => c.tiempo !== accion.tiempo);
      }
      const resto = estado.filter((c) => c.tiempo !== accion.comida.tiempo);
      return [...resto, accion.comida];
    },
  );

  const porTiempo = new Map(comidasVista.map((c) => [c.tiempo, c]));
  const metas = (configuracion.metas_porciones ?? {}) as Porciones;
  const horarios = configuracion.horarios ?? {};
  const totales = totalesDia(comidasVista);
  const registradas = comidasVista.filter(
    (c) => estadoComida(c) !== "pendiente",
  ).length;

  const esHoy = fecha === hoy;

  function irA(nuevaFecha: string) {
    // replace y no push: navegar entre días no debe llenar el historial.
    router.replace(nuevaFecha === hoy ? "/hoy" : `/hoy?fecha=${nuevaFecha}`);
  }

  /** Fila optimista con la forma que devolverá el servidor. */
  function filaOptimista(tiempo: ClaveTiempo, campos: Partial<Comida>): Comida {
    const previa = porTiempo.get(tiempo);
    return {
      id: previa?.id ?? `optimista-${tiempo}`,
      user_id: previa?.user_id ?? "",
      created_at: previa?.created_at ?? "",
      updated_at: new Date().toISOString(),
      fecha,
      tiempo,
      modo: "manual",
      menu_id: null,
      nombre_menu: null,
      texto_libre: null,
      porciones: {},
      kcal: null,
      ...campos,
    };
  }

  /** Cierra la hoja, pinta el resultado y recién después llama al servidor. */
  function ejecutar(optimista: Accion, accion: () => Promise<{ ok: boolean }>) {
    setAbierta(null);
    setAviso("");
    iniciar(async () => {
      aplicar(optimista);
      const r = await accion();
      if (!r.ok) setAviso(AVISO_FALLO);
    });
  }

  function elegirMenu(tiempo: ClaveTiempo, menu: Menu) {
    ejecutar(
      {
        tipo: "guardar",
        comida: filaOptimista(tiempo, {
          modo: "menu",
          menu_id: menu.id,
          nombre_menu: menu.nombre,
          porciones: limpiarPorciones(menu.porciones),
          kcal: menu.kcal,
        }),
      },
      () =>
        guardarComida({ fecha, tiempo, modo: "menu", menu_id: menu.id }),
    );
  }

  function guardarPorciones(
    tiempo: ClaveTiempo,
    porciones: Porciones,
    kcal: number | null,
  ) {
    const limpias = limpiarPorciones(porciones);
    ejecutar(
      {
        tipo: "guardar",
        comida: filaOptimista(tiempo, {
          modo: "manual",
          porciones: limpias,
          kcal,
        }),
      },
      () =>
        guardarComida({
          fecha,
          tiempo,
          modo: "manual",
          porciones: limpias,
          kcal,
        }),
    );
  }

  function guardarFuera(
    tiempo: ClaveTiempo,
    texto: string,
    porciones: Porciones,
    kcal: number | null,
  ) {
    const limpias = limpiarPorciones(porciones);
    const textoFinal = texto.trim() || "Comí fuera";
    ejecutar(
      {
        tipo: "guardar",
        comida: filaOptimista(tiempo, {
          modo: "fuera",
          texto_libre: textoFinal,
          porciones: limpias,
          kcal,
        }),
      },
      () =>
        guardarComida({
          fecha,
          tiempo,
          modo: "fuera",
          texto_libre: textoFinal,
          porciones: limpias,
          kcal,
        }),
    );
  }

  function borrar(tiempo: ClaveTiempo) {
    ejecutar({ tipo: "borrar", tiempo }, () => borrarComida(fecha, tiempo));
  }

  const tiempoAbierto = abierta
    ? TIEMPOS.find((t) => t.clave === abierta)
    : undefined;

  return (
    <>
      <EncabezadoHoy
        fecha={fecha}
        esHoy={esHoy}
        metas={metas}
        totales={totales}
        comidasRegistradas={registradas}
        onDiaAnterior={() => irA(sumarDias(fecha, -1))}
        onDiaSiguiente={() => irA(sumarDias(fecha, 1))}
        onVolverAHoy={() => irA(hoy)}
      />

      <div className="flex flex-col gap-2.5 px-5 pt-4">
        {TIEMPOS.map((t) => (
          <TarjetaComida
            key={t.clave}
            etiqueta={t.etiqueta}
            hora={horarios[t.clave]}
            comida={porTiempo.get(t.clave)}
            onAbrir={() => setAbierta(t.clave)}
          />
        ))}

        {aviso ? (
          <p role="status" className="pt-1 text-[13.5px] text-tinta-2">
            {aviso}
          </p>
        ) : null}
      </div>

      {tiempoAbierto ? (
        <HojaComida
          abierta
          onCerrar={() => setAbierta(null)}
          tiempo={tiempoAbierto.clave}
          etiqueta={tiempoAbierto.etiqueta}
          hora={horarios[tiempoAbierto.clave]}
          comida={porTiempo.get(tiempoAbierto.clave)}
          metas={metas}
          menus={menus.filter((m) => m.tiempo === tiempoAbierto.clave)}
          alimentos={alimentos}
          onElegirMenu={(menu) => elegirMenu(tiempoAbierto.clave, menu)}
          onGuardarPorciones={(porciones, kcal) =>
            guardarPorciones(tiempoAbierto.clave, porciones, kcal)
          }
          onGuardarFuera={(texto, porciones, kcal) =>
            guardarFuera(tiempoAbierto.clave, texto, porciones, kcal)
          }
          onBorrar={() => borrar(tiempoAbierto.clave)}
        />
      ) : null}
    </>
  );
}

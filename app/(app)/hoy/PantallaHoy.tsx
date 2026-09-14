"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Boton from "@/components/ui/Boton";
import { estadoComida, resumenDia, totalesDia } from "@/lib/dia";
import { TIEMPOS, type ClaveTiempo } from "@/lib/dominio";
import { sumarDias } from "@/lib/fechas";
import { limpiarPorciones } from "@/lib/porciones";
import { AVISO_FALLO, avisoDeFallo } from "@/lib/red";
import { opcionesEntrenamiento } from "@/lib/rutinas";
import type {
  Alimento,
  Comida,
  Configuracion,
  Dia,
  Menu,
  Porciones,
} from "@/lib/supabase/tipos";
import {
  borrarComida,
  cerrarDia,
  guardarComida,
  guardarDia,
  reabrirDia,
} from "./acciones";
import EncabezadoHoy from "./EncabezadoHoy";
import HojaCierre from "./HojaCierre";
import HojaComida from "./HojaComida";
import HojaRutina, { type RutinaHoja } from "./HojaRutina";
import TarjetaComida from "./TarjetaComida";
import TarjetasDia from "./TarjetasDia";

type Props = {
  fecha: string;
  hoy: string;
  configuracion: Pick<
    Configuracion,
    "metas_porciones" | "horarios" | "meta_agua_ml"
  >;
  comidas: Comida[];
  /** Puede no existir: la fila se crea con el primer dato del día. */
  dia: DiaVista | null;
  menus: Menu[];
  alimentos: Alimento[];
  /** Las rutinas activas, en su orden. */
  rutinas: RutinaHoja[];
};

type Accion =
  | { tipo: "guardar"; comida: Comida }
  | { tipo: "borrar"; tiempo: string };

/** Los campos de dias que usa esta pantalla. */
export type DiaVista = Pick<
  Dia,
  | "agua_ml"
  | "kcal_activas"
  | "entrenamiento"
  | "entrenamiento_minutos"
  | "estado_tobillo"
  | "cerrado"
>;

/* Valores por defecto cuando todavía no hay fila de dias. */
const DIA_VACIO: DiaVista = {
  agua_ml: 0,
  kcal_activas: null,
  entrenamiento: [],
  entrenamiento_minutos: null,
  estado_tobillo: null,
  cerrado: false,
};

const META_AGUA_POR_DEFECTO = 2000;

export default function PantallaHoy({
  fecha,
  hoy,
  configuracion,
  comidas,
  dia,
  menus,
  alimentos,
  rutinas,
}: Props) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [abierta, setAbierta] = useState<ClaveTiempo | null>(null);
  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [rutinaAbierta, setRutinaAbierta] = useState(false);
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

  /*
    El día se pinta optimista igual que las comidas: tocar "+250 ml" varias
    veces seguidas tiene que responder en cada toque, sin esperar al servidor.
  */
  const [diaVista, aplicarDia] = useOptimistic(
    dia ?? DIA_VACIO,
    (estado: DiaVista, campos: Partial<DiaVista>) => ({ ...estado, ...campos }),
  );

  const porTiempo = new Map(comidasVista.map((c) => [c.tiempo, c]));
  const metas = (configuracion.metas_porciones ?? {}) as Porciones;
  const horarios = configuracion.horarios ?? {};
  const totales = totalesDia(comidasVista);
  const registradas = comidasVista.filter(
    (c) => estadoComida(c) !== "pendiente",
  ).length;

  const esHoy = fecha === hoy;
  const metaAgua = configuracion.meta_agua_ml ?? META_AGUA_POR_DEFECTO;

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

  /*
    Llama al servidor. Sin red la acción no responde: rechaza, y sin el catch
    ese rechazo reemplazaría la pantalla entera por el error.
  */
  async function llamar(accion: () => Promise<{ ok: boolean }>) {
    try {
      const r = await accion();
      if (!r.ok) setAviso(AVISO_FALLO);
    } catch (e) {
      setAviso(avisoDeFallo(e));
    }
  }

  /** Cierra la hoja, pinta el resultado y recién después llama al servidor. */
  function ejecutar(optimista: Accion, accion: () => Promise<{ ok: boolean }>) {
    setAbierta(null);
    setAviso("");
    iniciar(async () => {
      aplicar(optimista);
      await llamar(accion);
    });
  }

  /** Pinta el cambio del día y llama al servidor. */
  function mutarDia(
    campos: Partial<DiaVista>,
    accion: () => Promise<{ ok: boolean }>,
  ) {
    setAviso("");
    iniciar(async () => {
      aplicarDia(campos);
      await llamar(accion);
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
        diaCerrado={diaVista.cerrado}
        onDiaAnterior={() => irA(sumarDias(fecha, -1))}
        onDiaSiguiente={() => irA(sumarDias(fecha, 1))}
        onVolverAHoy={() => irA(hoy)}
      />

      <div className="flex flex-col gap-2.5 px-5 pb-[92px] pt-4">
        {TIEMPOS.map((t) => (
          <TarjetaComida
            key={t.clave}
            etiqueta={t.etiqueta}
            hora={horarios[t.clave]}
            comida={porTiempo.get(t.clave)}
            onAbrir={() => setAbierta(t.clave)}
          />
        ))}

        <TarjetasDia
          aguaMl={diaVista.agua_ml}
          metaAguaMl={metaAgua}
          kcalActivas={diaVista.kcal_activas}
          entrenamiento={diaVista.entrenamiento}
          opcionesEntrenamiento={opcionesEntrenamiento(rutinas)}
          onVerRutina={() => setRutinaAbierta(true)}
          minutos={diaVista.entrenamiento_minutos}
          tobillo={diaVista.estado_tobillo}
          onAgua={(agua_ml) =>
            mutarDia({ agua_ml }, () => guardarDia(fecha, { agua_ml }))
          }
          onKcal={(kcal_activas) =>
            mutarDia({ kcal_activas }, () =>
              guardarDia(fecha, { kcal_activas }),
            )
          }
          onEntrenamiento={(entrenamiento) =>
            mutarDia({ entrenamiento }, () =>
              guardarDia(fecha, { entrenamiento }),
            )
          }
          onMinutos={(entrenamiento_minutos) =>
            mutarDia({ entrenamiento_minutos }, () =>
              guardarDia(fecha, { entrenamiento_minutos }),
            )
          }
          onTobillo={(estado_tobillo) =>
            mutarDia({ estado_tobillo }, () =>
              guardarDia(fecha, { estado_tobillo }),
            )
          }
        />
      </div>

      {/* Botón fijo, por encima de la barra inferior. */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+74px)] left-1/2 z-[41] w-full max-w-[430px] -translate-x-1/2 px-5">
        {/*
          El aviso va pegado al botón, igual que en Configuración: si fuera al
          final de la lista, al registrar una comida de arriba no se vería.
        */}
        {aviso ? (
          <p
            role="status"
            className="mb-2 rounded-control border border-linea bg-fondo px-3 py-2 text-[13px] leading-snug text-tinta-2"
          >
            {aviso}
          </p>
        ) : null}
        {diaVista.cerrado ? (
          // Reabrir no pide confirmación: es reversible y no pierde nada.
          <Boton
            variante="secundaria"
            className="shadow-boton"
            onClick={() =>
              mutarDia({ cerrado: false }, () => reabrirDia(fecha))
            }
          >
            Reabrir día
          </Boton>
        ) : (
          <Boton
            className="shadow-boton"
            onClick={() => setCierreAbierto(true)}
          >
            Cerrar día
          </Boton>
        )}
      </div>

      <HojaCierre
        abierta={cierreAbierto}
        onCerrar={() => setCierreAbierto(false)}
        fecha={fecha}
        filas={resumenDia(comidasVista, diaVista)}
        onConfirmar={() => {
          setCierreAbierto(false);
          mutarDia({ cerrado: true }, () => cerrarDia(fecha));
        }}
      />

      {/* Se monta al abrir: la pestaña inicial sigue a lo marcado ese día. */}
      {rutinaAbierta ? (
        <HojaRutina
          abierta
          onCerrar={() => setRutinaAbierta(false)}
          rutinas={rutinas}
          entrenamiento={diaVista.entrenamiento}
        />
      ) : null}

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

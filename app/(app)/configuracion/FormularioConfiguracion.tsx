"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/app/entrar/acciones";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import HojaInferior from "@/components/ui/HojaInferior";
import {
  GRUPOS,
  TIEMPOS,
  type ClaveGrupo,
  type ClaveTiempo,
} from "@/lib/dominio";
import { avisoDeFallo } from "@/lib/red";
import {
  validarConfiguracion,
  type ConfiguracionFormulario,
} from "@/lib/validarConfiguracion";
import { guardarConfiguracion, type RespuestaConfiguracion } from "./acciones";
import BotonCerrarSesion from "./BotonCerrarSesion";

type Props = {
  inicial: ConfiguracionFormulario;
  /** false si todavía no hay fila: se muestran los valores por defecto. */
  existe: boolean;
  correo: string;
};

const DURACION_AVISO = 2500;

const CLASE_FECHA_HORA =
  "h-[52px] rounded-control border bg-superficie px-3 font-serif text-tinta focus:outline-none";

function borde(invalido: boolean) {
  // Ámbar para lo que hay que corregir. Nunca rojo.
  return invalido
    ? "border-ambar focus:border-ambar"
    : "border-borde focus:border-verde-borde";
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 mt-[26px] border-b border-linea pb-[9px] text-[12.5px] uppercase tracking-[0.06em] text-tinta-3">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Detalle({ texto }: { texto?: string }) {
  return texto ? (
    <p className="mt-1 text-[12px] leading-snug text-tinta-2">{texto}</p>
  ) : null;
}

export default function FormularioConfiguracion({ inicial, existe, correo }: Props) {
  const router = useRouter();
  const idPrefijo = useId();

  const [valores, setValores] = useState(inicial);
  const [guardados, setGuardados] = useState(inicial);
  const [hayFila, setHayFila] = useState(existe);
  // Los errores se muestran recién después del primer intento de guardar.
  const [intentado, setIntentado] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [aviso, setAviso] = useState("");
  const [destinoPendiente, setDestinoPendiente] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  const hayCambios = JSON.stringify(valores) !== JSON.stringify(guardados);

  /*
    Los errores se DERIVAN de los valores en cada render, no se guardan en
    estado: al corregir un campo su marca desaparece sola, y un error que
    depende de dos campos (retorno antes que operación) se actualiza al tocar
    cualquiera de los dos.
  */
  const validacion = validarConfiguracion(valores);
  const errores = intentado && !validacion.ok ? validacion.errores : [];
  const errorDe = (campo: string) =>
    errores.find((e) => e.campo === campo)?.detalle;

  /* ---------------------------------------------------------------------- */
  /* Aviso breve de "Cambios guardados."                                    */
  /* ---------------------------------------------------------------------- */
  const temporizador = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    },
    [],
  );

  function mostrarAviso(texto: string) {
    setAviso(texto);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAviso(""), DURACION_AVISO);
  }

  /* ---------------------------------------------------------------------- */
  /* Salir con cambios sin guardar                                           */
  /* ---------------------------------------------------------------------- */

  const hayCambiosRef = useRef(hayCambios);
  useEffect(() => {
    hayCambiosRef.current = hayCambios;
  }, [hayCambios]);

  /*
    Las pestañas de la barra inferior son enlaces del shell, que no sabe nada
    de esta pantalla. En vez de tocar el shell, se intercepta el clic en fase de
    CAPTURA sobre window: corre antes que cualquier manejador de React (el de
    <Link> incluido), así que cancelarlo acá evita la navegación.
  */
  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (!hayCambiosRef.current) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const enlace = (e.target as Element | null)?.closest?.("a[href]");
      if (!(enlace instanceof HTMLAnchorElement) || enlace.target === "_blank") return;

      const url = new URL(enlace.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      setDestinoPendiente(url.pathname + url.search);
    }

    window.addEventListener("click", alHacerClic, true);
    return () => window.removeEventListener("click", alHacerClic, true);
  }, []);

  function salirA(destino: string) {
    if (hayCambios) setDestinoPendiente(destino);
    else router.push(destino);
  }

  function descartarYSalir() {
    const destino = destinoPendiente ?? "/hoy";
    setDestinoPendiente(null);
    router.push(destino);
  }

  /* ---------------------------------------------------------------------- */
  /* Edición y guardado                                                      */
  /* ---------------------------------------------------------------------- */

  function tocar() {
    setAviso("");
    setErrorServidor("");
  }

  function cambiar<K extends Exclude<keyof ConfiguracionFormulario, "metas_porciones" | "horarios">>(
    campo: K,
    valor: string,
  ) {
    tocar();
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function cambiarGrupo(grupo: ClaveGrupo, valor: string) {
    tocar();
    setValores((v) => ({ ...v, metas_porciones: { ...v.metas_porciones, [grupo]: valor } }));
  }

  function cambiarHorario(tiempo: ClaveTiempo, valor: string) {
    tocar();
    setValores((v) => ({ ...v, horarios: { ...v.horarios, [tiempo]: valor } }));
  }

  function guardar() {
    setIntentado(true);
    setErrorServidor("");
    setAviso("");
    // Nunca se envía algo inválido: los campos quedan marcados y no se guarda.
    if (!validacion.ok) return;

    const enviados = valores;
    iniciar(async () => {
      // Sin red la acción rechaza en vez de responder: el aviso va al pie,
      // como cualquier otro error, y lo escrito queda en el formulario.
      let r: RespuestaConfiguracion;
      try {
        r = await guardarConfiguracion(enviados);
      } catch (e) {
        setErrorServidor(avisoDeFallo(e));
        return;
      }
      if (r.ok) {
        // Lo enviado pasa a ser lo guardado. Si se siguió escribiendo mientras
        // tanto, eso sigue contando como cambio.
        setGuardados(enviados);
        setIntentado(false);
        setHayFila(true);
        mostrarAviso("Cambios guardados.");
      } else {
        setErrorServidor(r.errores.map((e) => e.mensaje).join(" · "));
      }
    });
  }

  const mensajeAlPie =
    errores.length > 0
      ? `Revisa antes de guardar: ${errores.map((e) => e.mensaje).join(" · ")}.`
      : errorServidor;

  return (
    <>
      {/*
        El padding inferior deja el contenido por encima del botón fijo. Con un
        mensaje encima del botón, el bloque fijo crece (una lista de errores
        puede ocupar varias líneas) y el padding crece con él, para que no tape
        el final de la pantalla.
      */}
      <div
        className={`px-5 pt-[calc(env(safe-area-inset-top)+22px)] ${
          aviso || mensajeAlPie ? "pb-[190px]" : "pb-[110px]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Volver a Hoy"
            onClick={() => salirA("/hoy")}
            className="h-10 w-10 shrink-0 rounded-control border border-borde bg-superficie text-[20px] leading-none text-tinta-2"
          >
            ‹
          </button>
          <h1 className="font-serif text-[27px] font-medium text-tinta">
            Configuración
          </h1>
        </div>
        <p className="mt-1.5 text-[13px] text-tinta-3">
          Lo que entregó la nutricionista, editable acá.
        </p>

        {!hayFila ? (
          <p className="mt-3 rounded-control bg-superficie-suave px-3 py-2.5 text-[13.5px] text-tinta-2">
            Todavía no hay configuración guardada.
          </p>
        ) : null}

        <Seccion titulo="Metas diarias de porciones">
          {/* items-start: un mensaje bajo un campo no estira al de al lado. */}
          <div className="grid grid-cols-2 items-start gap-2.5">
            {GRUPOS.map((g) => {
              const campo = `metas_porciones.${g.clave}`;
              return (
                <div key={g.clave}>
                  <CampoNumerico
                    etiqueta={g.etiqueta}
                    valor={valores.metas_porciones[g.clave]}
                    onChange={(v) => cambiarGrupo(g.clave, v)}
                    modo="decimal"
                    tamano="mediano"
                    invalido={Boolean(errorDe(campo))}
                  />
                  <Detalle texto={errorDe(campo)} />
                </div>
              );
            })}
          </div>
          <div className="mt-2.5">
            <CampoNumerico
              etiqueta="Agua (ml)"
              valor={valores.meta_agua_ml}
              onChange={(v) => cambiar("meta_agua_ml", v)}
              modo="entero"
              tamano="mediano"
              invalido={Boolean(errorDe("meta_agua_ml"))}
            />
            <Detalle texto={errorDe("meta_agua_ml")} />
          </div>
        </Seccion>

        <Seccion titulo="Metas objetivo">
          <div className="grid grid-cols-2 items-start gap-2.5">
            {(
              [
                ["meta_pct_grasa", "% de grasa"],
                ["meta_peso", "Peso (kg)"],
                ["meta_cintura", "Cintura (cm)"],
              ] as const
            ).map(([campo, etiqueta]) => (
              <div key={campo}>
                <CampoNumerico
                  etiqueta={etiqueta}
                  valor={valores[campo]}
                  onChange={(v) => cambiar(campo, v)}
                  modo="decimal"
                  tamano="mediano"
                  invalido={Boolean(errorDe(campo))}
                />
                <Detalle texto={errorDe(campo)} />
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Horarios sugeridos">
          <div className="flex flex-col gap-2.5">
            {TIEMPOS.map((t) => {
              const id = `${idPrefijo}-${t.clave}`;
              const error = errorDe(`horarios.${t.clave}`);
              return (
                <div key={t.clave}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-[15px] text-tinta-cuerpo">
                      {t.etiqueta}
                    </label>
                    <input
                      id={id}
                      type="time"
                      value={valores.horarios[t.clave]}
                      onChange={(e) => cambiarHorario(t.clave, e.target.value)}
                      aria-invalid={Boolean(error) || undefined}
                      className={`${CLASE_FECHA_HORA} w-[132px] shrink-0 text-[20px] ${borde(Boolean(error))}`}
                    />
                  </div>
                  {error ? (
                    <p className="mt-1 text-right text-[12px] text-tinta-2">{error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Seccion>

        <Seccion titulo="Recuperación">
          <div className="flex flex-col gap-3">
            {(
              [
                ["fecha_operacion", "Fecha de operación"],
                ["fecha_retorno", "Fecha de retorno objetivo"],
              ] as const
            ).map(([campo, etiqueta]) => {
              const id = `${idPrefijo}-${campo}`;
              const error = errorDe(campo);
              return (
                <div key={campo}>
                  <label htmlFor={id} className="block text-[12px] text-tinta-3">
                    {etiqueta}
                  </label>
                  {/* Sin tope: las dos fechas pueden ser futuras. */}
                  <input
                    id={id}
                    type="date"
                    value={valores[campo]}
                    onChange={(e) => cambiar(campo, e.target.value)}
                    aria-invalid={Boolean(error) || undefined}
                    className={`${CLASE_FECHA_HORA} mt-1.5 w-full text-[19px] ${borde(Boolean(error))}`}
                  />
                  <Detalle texto={error} />
                </div>
              );
            })}
          </div>
        </Seccion>

        <Seccion titulo="Cuenta">
          <p className="text-[14px] text-tinta-2">
            Sesión iniciada como <span className="text-tinta">{correo}</span>
          </p>
          <form action={cerrarSesion} className="mt-3">
            <BotonCerrarSesion />
          </form>
        </Seccion>
      </div>

      {/* Botón fijo, por encima de la barra inferior, como el "Cerrar día" de Hoy. */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+74px)] left-1/2 z-[41] w-full max-w-[430px] -translate-x-1/2 px-5">
        {aviso || mensajeAlPie ? (
          <p
            role="status"
            className={`mb-2 rounded-control border border-linea bg-fondo px-3 py-2 text-[13px] leading-snug ${
              aviso ? "text-verde-oscuro" : "text-tinta-2"
            }`}
          >
            {aviso || mensajeAlPie}
          </p>
        ) : null}
        <Boton
          className="shadow-boton"
          onClick={guardar}
          disabled={!hayCambios || guardando}
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </div>

      <HojaInferior
        abierta={destinoPendiente !== null}
        onCerrar={() => setDestinoPendiente(null)}
        titulo="Tienes cambios sin guardar"
      >
        <p className="text-[14.5px] leading-relaxed text-tinta-2">
          Si sales ahora, se pierden los cambios que todavía no guardaste.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Boton onClick={() => setDestinoPendiente(null)}>Seguir editando</Boton>
          <Boton variante="secundaria" onClick={descartarYSalir}>
            Descartar y salir
          </Boton>
        </div>
      </HojaInferior>
    </>
  );
}

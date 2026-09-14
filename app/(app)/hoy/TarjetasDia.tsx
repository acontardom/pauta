"use client";

import { useEffect, useRef, useState } from "react";
import Chip from "@/components/ui/Chip";
import { ESTADOS_TOBILLO } from "@/lib/dominio";
import { textoLitros } from "@/lib/dia";
import { parsear } from "@/lib/numeros";
import type { OpcionEntrenamiento } from "@/lib/rutinas";
import type { EstadoTobillo } from "@/lib/supabase/tipos";

const PASO_AGUA = 250;
/** Retardo antes de guardar lo que se escribe, desde la última tecla. */
const RETARDO = 600;

type Props = {
  aguaMl: number;
  metaAguaMl: number;
  kcalActivas: number | null;
  entrenamiento: string[];
  /** Las sesiones de las rutinas activas, en orden. */
  opcionesEntrenamiento: OpcionEntrenamiento[];
  tobillo: EstadoTobillo | null;
  onAgua: (ml: number) => void;
  onKcal: (kcal: number | null) => void;
  onEntrenamiento: (opciones: string[]) => void;
  onVerRutina: () => void;
  onTobillo: (estado: EstadoTobillo | null) => void;
};

function Tarjeta({
  titulo,
  derecha,
  children,
}: {
  titulo: string;
  derecha?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-tarjeta border border-linea bg-superficie p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] uppercase tracking-[0.06em] text-tinta-3">
          {titulo}
        </h2>
        {derecha}
      </div>
      {children}
    </div>
  );
}

export default function TarjetasDia({
  aguaMl,
  metaAguaMl,
  kcalActivas,
  entrenamiento,
  opcionesEntrenamiento,
  tobillo,
  onAgua,
  onKcal,
  onEntrenamiento,
  onVerRutina,
  onTobillo,
}: Props) {
  // Una celda por cada 250 ml de la meta, redondeando hacia arriba.
  const celdas = Math.max(1, Math.ceil(metaAguaMl / PASO_AGUA));

  /*
    Lo guardado que ya no es una opción ("Tren superior", "Bicicleta",
    "Descanso", o la sesión de una rutina desactivada). Se muestra marcado al
    final; tocarlo lo quita, y una vez quitado no se puede volver a elegir.
  */
  const etiquetas = opcionesEntrenamiento.map((o) => o.etiqueta);
  const antiguas = entrenamiento.filter((x) => !etiquetas.includes(x));

  return (
    <>
      <Tarjeta
        titulo="Agua"
        derecha={
          <span className="font-serif text-[18px] text-tinta">
            {textoLitros(aguaMl)} / {textoLitros(metaAguaMl)} L
          </span>
        }
      >
        <div className="mt-3 flex gap-[5px]">
          {Array.from({ length: celdas }, (_, i) => (
            <div
              key={i}
              className={`h-[26px] flex-1 rounded-md ${
                // Pasarse de la meta llena todas las celdas y nada más: el
                // texto sigue mostrando el total real.
                i * PASO_AGUA < aguaMl ? "bg-azul" : "bg-vacio"
              }`}
            />
          ))}
        </div>
        <div className="mt-[14px] flex gap-2.5">
          <button
            type="button"
            aria-label="Quitar 250 ml"
            onClick={() => onAgua(Math.max(0, aguaMl - PASO_AGUA))}
            className="h-12 w-[58px] shrink-0 rounded-control border border-borde bg-fondo text-[20px] text-tinta-2"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onAgua(aguaMl + PASO_AGUA)}
            className="h-12 flex-1 rounded-control border border-verde-borde bg-verde-fondo text-[15px] font-medium text-verde-oscuro"
          >
            +250 ml
          </button>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Calorías activas">
        <div className="mt-2.5 flex items-center gap-3">
          <CampoDiferido
            valor={kcalActivas}
            onGuardar={onKcal}
            placeholder="0"
            className="h-[56px] min-w-0 flex-1 text-[26px]"
            etiqueta="Calorías activas"
          />
          {/* Es gasto, no consumo: no se mezcla con el contador de kcal. */}
          <span className="text-[14px] text-tinta-3">kcal del reloj</span>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Entrenamiento"
        derecha={
          <button
            type="button"
            onClick={onVerRutina}
            className="-my-2 py-2 pl-3 text-[14px] font-medium text-verde"
          >
            Ver rutina
          </button>
        }
      >
        <div className="mt-3 flex flex-wrap gap-[7px]">
          {/* Dos líneas: la sesión y, en chico, el nombre de la rutina. */}
          {opcionesEntrenamiento.map(({ etiqueta, nombre }) => {
            const puesta = entrenamiento.includes(etiqueta);
            return (
              <Chip
                key={etiqueta}
                etiqueta={etiqueta}
                detalle={nombre}
                encendido={puesta}
                onToggle={() =>
                  onEntrenamiento(
                    puesta
                      ? entrenamiento.filter((x) => x !== etiqueta)
                      : [...entrenamiento, etiqueta],
                  )
                }
                className="grow basis-[140px]"
              />
            );
          })}
          {antiguas.map((antigua) => (
            <Chip
              key={antigua}
              etiqueta={antigua}
              encendido
              onToggle={() =>
                onEntrenamiento(entrenamiento.filter((x) => x !== antigua))
              }
            />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Tobillo">
        <div className="mt-3 flex gap-2">
          {ESTADOS_TOBILLO.map((e) => {
            const puesto = tobillo === e.clave;
            return (
              <Chip
                key={e.clave}
                etiqueta={e.etiqueta}
                encendido={puesto}
                // Tocar la opción elegida la desmarca y vuelve a null.
                onToggle={() => onTobillo(puesto ? null : e.clave)}
                className="flex-1"
              />
            );
          })}
        </div>
      </Tarjeta>
    </>
  );
}

/*
  Campo numérico que guarda 600 ms después de la última tecla, y también al
  perder el foco. Sin eso, escribir "420" dispararía tres guardados.

  No usa CampoNumerico porque el diseño pide estos campos en serif grande y
  sin etiqueta arriba: la etiqueta la pone el texto de al lado. El resto de la
  app sigue usando CampoNumerico.
*/
function CampoDiferido({
  valor,
  onGuardar,
  placeholder,
  className,
  etiqueta,
}: {
  valor: number | null;
  onGuardar: (valor: number | null) => void;
  placeholder: string;
  className: string;
  etiqueta: string;
}) {
  const [texto, setTexto] = useState(valor != null ? String(valor) : "");
  const temporizador = useRef<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  // Se limpia el temporizador al desmontar, para no guardar después de salir.
  useEffect(
    () => () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    },
    [],
  );

  function aNumero(t: string): number | null {
    const n = parsear(t);
    return n != null && Number.isInteger(n) && n >= 0 ? n : null;
  }

  function escribir(t: string) {
    const limpio = t.replace(/[^\d]/g, "");
    setTexto(limpio);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      onGuardar(aNumero(limpio));
    }, RETARDO);
  }

  function guardarYa() {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    onGuardar(aNumero(texto));
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={etiqueta}
      value={texto}
      placeholder={placeholder}
      onChange={(e) => escribir(e.target.value)}
      onBlur={guardarYa}
      onFocus={() => {
        window.setTimeout(() => {
          ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 300);
      }}
      className={`rounded-control border border-borde bg-fondo px-[14px] font-serif text-tinta placeholder:text-tinta-5 focus:border-verde-borde focus:outline-none ${className}`}
    />
  );
}

"use client";

import { useState } from "react";
import HojaInferior from "@/components/ui/HojaInferior";
import Segmentos from "@/components/ui/Segmentos";
import {
  ejerciciosEnOrden,
  etiquetaPestana,
  rutinaInicial,
  textoEjercicio,
} from "@/lib/rutinas";
import type { Rutina } from "@/lib/supabase/tipos";

/** Los campos de rutinas que usa Hoy. */
export type RutinaHoja = Pick<
  Rutina,
  "id" | "bloque" | "clave" | "nombre" | "nota" | "ejercicios"
>;

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  /** Solo las activas, ya en su orden. */
  rutinas: RutinaHoja[];
  /** Lo marcado ese día: decide la pestaña con que abre. */
  entrenamiento: string[];
};

/*
  La rutina para seguirla mientras se entrena. Es solo de lectura: no hay
  nada que marcar ejercicio por ejercicio. Lo que se registra es la sesión,
  con el chip de la tarjeta de entrenamiento.
*/
export default function HojaRutina({
  abierta,
  onCerrar,
  rutinas,
  entrenamiento,
}: Props) {
  // Se monta al abrir, así la pestaña inicial sigue a lo marcado ese día.
  const [elegida, setElegida] = useState(() =>
    rutinaInicial(rutinas, entrenamiento),
  );
  const rutina = rutinas.find((r) => r.id === elegida) ?? rutinas[0];

  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={rutina?.bloque ?? "Rutina"}
    >
      {!rutina ? (
        <p className="text-[14.5px] leading-relaxed text-tinta-2">
          No hay rutinas cargadas.
        </p>
      ) : (
        <>
          <Segmentos
            opciones={rutinas.map((r) => ({
              valor: r.id,
              etiqueta: etiquetaPestana(r),
            }))}
            valor={rutina.id}
            onChange={setElegida}
          />

          {rutina.nota ? (
            <p className="mt-3.5 rounded-tarjeta border border-verde-borde bg-verde-fondo px-4 py-3 text-[13.5px] leading-relaxed text-verde-oscuro">
              {rutina.nota}
            </p>
          ) : null}

          <ol className="mt-3 flex flex-col gap-2">
            {ejerciciosEnOrden(rutina.ejercicios).map((e, i) => (
              <li
                key={`${e.orden ?? "sin-orden"}-${i}`}
                className="flex gap-3 rounded-tarjeta border border-linea bg-superficie px-4 py-3.5"
              >
                <span className="w-5 shrink-0 font-serif text-[17px] leading-[1.3] text-tinta-4">
                  {e.orden ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15.5px] leading-snug text-tinta">
                    {e.nombre}
                  </p>
                  <p className="mt-1 font-mono text-[11.5px] text-tinta-3">
                    {textoEjercicio(e)}
                  </p>
                  {e.notas ? (
                    <p className="mt-1.5 text-[13px] italic leading-relaxed text-tinta-3">
                      {e.notas}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </HojaInferior>
  );
}

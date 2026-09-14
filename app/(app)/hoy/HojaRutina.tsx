"use client";

import { useState } from "react";
import HojaInferior from "@/components/ui/HojaInferior";
import Segmentos from "@/components/ui/Segmentos";
import {
  celdasEjercicio,
  ejerciciosEnOrden,
  etiquetaPestana,
  rutinaInicial,
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

  A la vista queda lo esencial (nombre, series, reps, descanso). Las reglas
  del bloque y las notas de cada ejercicio se despliegan, y todo parte
  cerrado: la hoja se monta al abrirse, así que el estado no sobrevive.
*/
export default function HojaRutina({
  abierta,
  onCerrar,
  rutinas,
  entrenamiento,
}: Props) {
  const [elegida, setElegida] = useState(() =>
    rutinaInicial(rutinas, entrenamiento),
  );
  const [reglasAbiertas, setReglasAbiertas] = useState(false);
  // Cada ejercicio abre y cierra por su cuenta: "idRutina:posición".
  const [notasAbiertas, setNotasAbiertas] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const rutina = rutinas.find((r) => r.id === elegida) ?? rutinas[0];

  function alternarNota(clave: string) {
    setNotasAbiertas((actuales) => {
      const nuevas = new Set(actuales);
      if (nuevas.has(clave)) nuevas.delete(clave);
      else nuevas.add(clave);
      return nuevas;
    });
  }

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
            <>
              <button
                type="button"
                aria-expanded={reglasAbiertas}
                onClick={() => setReglasAbiertas((v) => !v)}
                className="mt-2 block py-1.5 text-left text-[14px] font-medium text-verde"
              >
                {reglasAbiertas ? "Ocultar reglas" : "Ver reglas del bloque"}
              </button>
              {reglasAbiertas ? (
                <p className="mt-1 rounded-tarjeta border border-verde-borde bg-verde-fondo px-4 py-3 text-[13.5px] leading-relaxed text-verde-oscuro">
                  {rutina.nota}
                </p>
              ) : null}
            </>
          ) : null}

          <ol className="mt-3 flex flex-col gap-2">
            {ejerciciosEnOrden(rutina.ejercicios).map((e, i) => {
              const clave = `${rutina.id}:${i}`;
              const notaAbierta = notasAbiertas.has(clave);
              return (
                <li
                  key={clave}
                  className="rounded-tarjeta border border-linea bg-superficie px-4 py-3"
                >
                  <div className="flex gap-3">
                    <span className="w-5 shrink-0 font-serif text-[17px] leading-[1.3] text-tinta-4">
                      {e.orden ?? i + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-[15.5px] leading-snug text-tinta">
                      {e.nombre}
                    </p>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    {celdasEjercicio(e).map((c) => (
                      <div
                        key={c.etiqueta}
                        className="min-w-0 rounded-[9px] bg-superficie-suave p-2"
                      >
                        <p className="text-[9.5px] uppercase tracking-[0.04em] text-tinta-4">
                          {c.etiqueta}
                        </p>
                        <p className="mt-0.5 font-serif text-[17px] leading-tight text-tinta">
                          {c.valor}
                        </p>
                      </div>
                    ))}
                  </div>

                  {e.notas ? (
                    <>
                      <button
                        type="button"
                        aria-expanded={notaAbierta}
                        onClick={() => alternarNota(clave)}
                        className="-mb-1 mt-1 py-1 text-[12.5px] font-medium text-verde"
                      >
                        {notaAbierta ? "Ocultar" : "Ver nota"}
                      </button>
                      {notaAbierta ? (
                        <p className="mb-0.5 mt-1 text-[13px] italic leading-relaxed text-tinta-3">
                          {e.notas}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </HojaInferior>
  );
}

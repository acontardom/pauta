"use client";

import type { ReactNode } from "react";
import { GRUPOS, type ClaveGrupo } from "@/lib/dominio";
import { formatear } from "@/lib/numeros";
import { ajustarPorcion } from "@/lib/porciones";
import type { Porciones } from "@/lib/supabase/tipos";

type Props = {
  valor: Porciones;
  onChange: (valor: Porciones) => void;
  /** Si viene, muestra "meta X" bajo la etiqueta de cada grupo. */
  metas?: Porciones | null;
  /** Contenido extra bajo cada fila (las equivalencias, en Hoy). */
  extra?: (grupo: ClaveGrupo) => ReactNode;
};

/*
  Una fila por grupo, en el orden de GRUPOS. Cada grupo avanza con su propio
  paso: aceite y grasas de 0,5 en 0,5, el resto de 1 en 1.

  Los botones son de 46px porque se usan con el pulgar, a veces varias veces
  seguidas.
*/
export default function SelectorPorciones({
  valor,
  onChange,
  metas,
  extra,
}: Props) {
  function ajustar(grupo: ClaveGrupo, paso: number, direccion: 1 | -1) {
    onChange({
      ...valor,
      [grupo]: ajustarPorcion(valor[grupo] ?? 0, paso, direccion),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {GRUPOS.map((g) => {
        const actual = valor[g.clave] ?? 0;
        const meta = metas?.[g.clave];

        return (
          <div
            key={g.clave}
            className="rounded-tarjeta border border-linea bg-superficie px-[14px] py-3"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-medium text-tinta">
                  {g.etiqueta}
                </div>
                {meta != null ? (
                  <div className="mt-0.5 text-[12px] text-tinta-4">
                    meta {formatear(meta)}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                aria-label={`Quitar ${g.etiqueta.toLowerCase()}`}
                onClick={() => ajustar(g.clave, g.paso, -1)}
                className="h-[46px] w-[46px] shrink-0 rounded-control border border-borde bg-fondo text-[20px] text-tinta-2"
              >
                −
              </button>

              <div className="w-10 shrink-0 text-center font-serif text-[22px] text-tinta">
                {formatear(actual)}
              </div>

              <button
                type="button"
                aria-label={`Agregar ${g.etiqueta.toLowerCase()}`}
                onClick={() => ajustar(g.clave, g.paso, 1)}
                className="h-[46px] w-[46px] shrink-0 rounded-control border border-verde-borde bg-verde-fondo text-[20px] text-verde-oscuro"
              >
                +
              </button>
            </div>

            {extra ? extra(g.clave) : null}
          </div>
        );
      })}
    </div>
  );
}

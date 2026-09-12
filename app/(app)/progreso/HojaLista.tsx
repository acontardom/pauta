"use client";

import Boton from "@/components/ui/Boton";
import HojaInferior from "@/components/ui/HojaInferior";
import { formatoLargoConAnio } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";
import type { Medida } from "@/lib/supabase/tipos";

type Props = {
  /** De la más reciente a la más antigua. */
  medidas: Medida[];
  onCerrar: () => void;
  onEditar: (medida: Medida) => void;
  onNuevo: () => void;
};

/** "83,4 kg · 95,7 cm", omitiendo el valor que falte. */
function valores(m: Medida): string {
  const partes: string[] = [];
  if (m.peso != null) partes.push(`${formatear(m.peso)} kg`);
  if (m.cintura != null) partes.push(`${formatear(m.cintura)} cm`);
  return partes.join(" · ");
}

export default function HojaLista({
  medidas,
  onCerrar,
  onEditar,
  onNuevo,
}: Props) {
  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo="Registros de peso y cintura"
    >
      <div className="flex flex-col gap-2.5">
        {medidas.length === 0 ? (
          <p className="text-[14.5px] leading-relaxed text-tinta-2">
            Todavía no hay registros de peso ni cintura.
          </p>
        ) : (
          medidas.map((m) => (
            <div
              key={m.id}
              className="flex items-baseline justify-between gap-2.5 rounded-tarjeta border border-linea bg-superficie px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="font-serif text-[17px] text-tinta">
                  {valores(m)}
                </p>
                <p className="mt-0.5 text-[12.5px] text-tinta-3">
                  {formatoLargoConAnio(m.fecha)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditar(m)}
                className="shrink-0 py-0.5 text-[13.5px] text-verde"
              >
                Editar
              </button>
            </div>
          ))
        )}

        <Boton className="mt-1.5" onClick={onNuevo}>
          Nuevo registro
        </Boton>
      </div>
    </HojaInferior>
  );
}

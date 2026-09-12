"use client";

import Boton from "@/components/ui/Boton";
import HojaInferior from "@/components/ui/HojaInferior";
import type { FilaResumen, TonoFila } from "@/lib/dia";
import { formatoLargo } from "@/lib/fechas";

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  fecha: string;
  filas: FilaResumen[];
  onConfirmar: () => void;
};

/* Tres tonos, ninguno de falla: verde para lo completo, azul para lo estimado
   y neutro para lo que no se registró. */
const PUNTO: Record<TonoFila, string> = {
  verde: "bg-verde",
  azul: "bg-azul",
  neutro: "bg-borde-fuerte",
};

const VALOR: Record<TonoFila, string> = {
  verde: "text-verde-oscuro",
  azul: "text-azul-texto",
  neutro: "text-tinta-4",
};

export default function HojaCierre({
  abierta,
  onCerrar,
  fecha,
  filas,
  onConfirmar,
}: Props) {
  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Cerrar el día"
      subtitulo={formatoLargo(fecha)}
    >
      {/* Solo lectura: desde acá no se edita nada. */}
      <div className="flex flex-col gap-2">
        {filas.map((f) => (
          <div
            key={f.etiqueta}
            className="flex items-center gap-3 rounded-xl border border-linea bg-superficie px-[15px] py-[13px]"
          >
            <span
              className={`h-[7px] w-[7px] shrink-0 rounded-full ${PUNTO[f.tono]}`}
            />
            <span className="min-w-0 flex-1 text-[15px] text-tinta-fila">
              {f.etiqueta}
            </span>
            <span
              className={`max-w-[52%] shrink truncate text-right text-[13px] ${VALOR[f.tono]}`}
            >
              {f.valor}
            </span>
          </div>
        ))}

        <p className="px-0.5 pt-2 text-[13.5px] leading-relaxed text-tinta-3">
          Así quedó el día. Lo que no alcanzaste a registrar queda como está: el
          día cuenta igual.
        </p>

        <Boton className="mt-1.5" onClick={onConfirmar}>
          Dar el día por registrado
        </Boton>
      </div>
    </HojaInferior>
  );
}

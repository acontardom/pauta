"use client";

import { estadoComida } from "@/lib/dia";
import { textoPorciones } from "@/lib/porciones";
import type { Comida } from "@/lib/supabase/tipos";

type Props = {
  etiqueta: string;
  hora?: string;
  comida?: Comida;
  onAbrir: () => void;
};

/*
  Los tres estados se distinguen por color y por el borde izquierdo.
  Ninguno usa rojo: una comida estimada va en azul y una pendiente en neutro,
  porque ninguna de las dos es una falla.
*/
const ESTILOS = {
  completa: {
    tarjeta: "border-verde-borde bg-verde-fondo-2 border-l-verde",
    punto: "bg-verde",
    texto: "text-verde-oscuro",
    etiqueta: "Completa",
  },
  estimada: {
    tarjeta: "border-azul-borde bg-azul-fondo border-l-azul",
    punto: "bg-azul",
    texto: "text-azul-texto",
    etiqueta: "Estimada",
  },
  pendiente: {
    tarjeta: "border-linea bg-superficie border-l-borde-fuerte",
    punto: "bg-borde-fuerte",
    texto: "text-tinta-4",
    etiqueta: "Pendiente",
  },
} as const;

export default function TarjetaComida({
  etiqueta,
  hora,
  comida,
  onAbrir,
}: Props) {
  const estado = estadoComida(comida);
  const e = ESTILOS[estado];

  const resumen = comida?.nombre_menu ?? comida?.texto_libre ?? "";
  const pie = comida ? textoPorciones(comida.porciones, comida.kcal) : "";

  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`w-full rounded-tarjeta border border-l-[3px] px-4 py-[15px] text-left transition-transform active:scale-[0.99] ${e.tarjeta}`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-serif text-[19px] font-medium text-tinta">
          {etiqueta}
        </span>
        {hora ? (
          <span className="text-[12.5px] tabular-nums text-tinta-4">{hora}</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className={`h-[7px] w-[7px] rounded-full ${e.punto}`} />
        <span
          className={`text-[12.5px] uppercase tracking-[0.04em] ${e.texto}`}
        >
          {e.etiqueta}
        </span>
      </div>

      {resumen ? (
        <p className="mt-2 text-[14.5px] leading-snug text-tinta-cuerpo">
          {resumen}
        </p>
      ) : null}

      {pie ? (
        <p className="mt-[7px] font-mono text-[11.5px] leading-relaxed text-tinta-3">
          {pie}
        </p>
      ) : null}
    </button>
  );
}

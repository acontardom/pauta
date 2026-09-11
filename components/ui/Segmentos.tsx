"use client";

export type Opcion<T extends string> = {
  valor: T;
  etiqueta: string;
};

type Props<T extends string> = {
  opciones: Opcion<T>[];
  valor: T;
  onChange: (valor: T) => void;
  className?: string;
};

/** Control segmentado: los tres modos de registro y los filtros de la línea de tiempo. */
export default function Segmentos<T extends string>({
  opciones,
  valor,
  onChange,
  className = "",
}: Props<T>) {
  return (
    <div className={`flex gap-1.5 ${className}`} role="tablist">
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(o.valor)}
            className={`h-10 min-w-0 flex-1 rounded-[10px] border px-1 text-[12.5px] ${
              activa
                ? "border-verde bg-verde text-white"
                : "border-borde bg-superficie text-tinta-2"
            }`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

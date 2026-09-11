"use client";

type Props = {
  etiqueta: string;
  encendido: boolean;
  onToggle: () => void;
  className?: string;
};

/** Píldora conmutable: filtros, etiquetas de entrenamiento, selección múltiple. */
export default function Chip({
  etiqueta,
  encendido,
  onToggle,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={encendido}
      onClick={onToggle}
      className={`h-[42px] rounded-full border px-[14px] text-[14px] ${
        encendido
          ? "border-verde-borde bg-verde-fondo font-semibold text-verde-oscuro"
          : "border-borde bg-fondo font-normal text-tinta-2"
      } ${className}`}
    >
      {etiqueta}
    </button>
  );
}

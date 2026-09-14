"use client";

type Props = {
  etiqueta: string;
  /** Segunda línea en chico, bajo la etiqueta. Con ella el chip es más alto. */
  detalle?: string;
  encendido: boolean;
  onToggle: () => void;
  className?: string;
};

/** Píldora conmutable: filtros, sesiones de entrenamiento, selección múltiple. */
export default function Chip({
  etiqueta,
  detalle,
  encendido,
  onToggle,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={encendido}
      onClick={onToggle}
      className={`rounded-full border px-[14px] ${
        detalle
          ? "flex h-[60px] flex-col items-center justify-center gap-0.5 leading-tight"
          : "h-[42px] text-[14px]"
      } ${
        encendido
          ? "border-verde-borde bg-verde-fondo font-semibold text-verde-oscuro"
          : "border-borde bg-fondo font-normal text-tinta-2"
      } ${className}`}
    >
      {detalle ? (
        <>
          <span className="text-[15px]">{etiqueta}</span>
          <span className="text-[11.5px] font-normal text-tinta-3">{detalle}</span>
        </>
      ) : (
        etiqueta
      )}
    </button>
  );
}

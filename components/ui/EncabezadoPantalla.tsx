import type { ReactNode } from "react";

type Props = {
  titulo: string;
  subtitulo?: string;
  /** Contenido extra bajo el título (Hoy pondrá aquí la navegación entre días). */
  children?: ReactNode;
};

/**
 * Encabezado de cada pantalla.
 * El padding derecho de 48px deja libre la esquina del botón de configuración.
 */
export default function EncabezadoPantalla({
  titulo,
  subtitulo,
  children,
}: Props) {
  return (
    <header className="border-b border-linea px-5 pr-12 pb-[14px] pt-[calc(env(safe-area-inset-top)+22px)]">
      <h1 className="font-serif text-[20px] font-medium tracking-[-0.01em] text-tinta">
        {titulo}
      </h1>
      {subtitulo ? (
        <p className="mt-0.5 text-[12.5px] text-tinta-3">{subtitulo}</p>
      ) : null}
      {children}
    </header>
  );
}

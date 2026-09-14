import type { ReactNode } from "react";

/*
  Piezas de los esqueletos de carga (los loading.tsx de cada pantalla).

  Sin animación: la espera es corta y un pulso solo llamaría la atención sobre
  ella. Los bloques imitan la silueta de la pantalla para que el contenido
  real aparezca en su lugar, sin saltos.
*/

/** Contenedor de un esqueleto: avisa a los lectores de pantalla que está cargando. */
export default function Esqueleto({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

/** Un bloque gris. El tamaño y el radio los pone quien lo usa. */
export function Bloque({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bg-vacio ${className}`} />;
}

/** Tarjeta vacía con el borde y el fondo de las tarjetas reales. */
export function TarjetaEsqueleto({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`rounded-tarjeta border border-linea bg-superficie p-4 ${className}`}
    >
      {children}
    </div>
  );
}

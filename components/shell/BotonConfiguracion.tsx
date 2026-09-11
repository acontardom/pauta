"use client";

import { useRouter } from "next/navigation";

type Props = {
  /** true cuando se está en /configuracion: el botón entonces vuelve. */
  enConfiguracion: boolean;
  /** Pestaña a la que volver desde /configuracion. */
  destinoVuelta: string;
};

/*
  Botón fijo de la esquina superior derecha.
  Desde una pestaña abre /configuracion; desde /configuracion vuelve a la última
  pestaña visitada, que guarda el layout del shell. No se usa router.back():
  el historial puede venir de cualquier parte y la vuelta debe ser predecible.
*/
export default function BotonConfiguracion({
  enConfiguracion,
  destinoVuelta,
}: Props) {
  const router = useRouter();
  const destino = enConfiguracion ? destinoVuelta : "/configuracion";

  return (
    <button
      type="button"
      aria-label={enConfiguracion ? "Volver" : "Configuración"}
      onClick={() => router.push(destino)}
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+18px)] z-[45] flex h-[38px] w-[38px] items-center justify-center rounded-control border border-linea bg-fondo/92 p-0"
    >
      <svg
        width="20"
        height="20"
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-tinta-3"
        aria-hidden
      >
        <circle r="4.2" />
        <circle r="9" strokeDasharray="3 2.4" />
      </svg>
    </button>
  );
}

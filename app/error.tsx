"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import Boton from "@/components/ui/Boton";
import { AVISO_SIN_CONEXION } from "@/lib/red";

/* El texto sigue al estado de la red: al volver la señal deja de decir "sin conexión". */
function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/*
  Error de cualquier pantalla. Tono neutro y nada en rojo: lo que ya estaba
  guardado no se pierde por esto, y casi siempre basta con reintentar.
*/
export default function ErrorPantalla({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const enLinea = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );

  return (
    <main className="flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+22px)]">
      <h1 className="font-serif text-[27px] font-medium text-tinta">
        No se pudo cargar
      </h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-tinta-2">
        {enLinea
          ? "Puede ser algo pasajero. Lo que ya estaba guardado sigue guardado."
          : AVISO_SIN_CONEXION}
      </p>
      <Boton className="mt-5" onClick={() => retry()}>
        Reintentar
      </Boton>
      <Link href="/hoy" className="mt-3 self-center py-2 text-[14px] text-verde">
        Ir a Hoy
      </Link>
    </main>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import BarraInferior, { PESTANAS } from "@/components/shell/BarraInferior";
import BotonConfiguracion from "@/components/shell/BotonConfiguracion";

export default function LayoutShell({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const enConfiguracion = ruta === "/configuracion";

  /*
    Última pestaña visitada, para que el engranaje sepa a dónde volver desde
    /configuracion. Vive en el estado del layout (no en almacenamiento del
    navegador); si la app se abre directo en /configuracion, se vuelve a /hoy.
  */
  const [ultimaPestana, setUltimaPestana] = useState("/hoy");
  if (ruta !== ultimaPestana && PESTANAS.some((p) => p.href === ruta)) {
    // Ajuste de estado durante el render: React lo vuelve a renderizar antes
    // de pintar, sin el parpadeo de un efecto.
    setUltimaPestana(ruta);
  }

  return (
    <>
      <BotonConfiguracion
        enConfiguracion={enConfiguracion}
        destinoVuelta={ultimaPestana}
      />
      {/* El padding inferior deja el contenido por encima de la barra. */}
      <main className="pb-[calc(env(safe-area-inset-bottom)+92px)]">
        {children}
      </main>
      <BarraInferior />
    </>
  );
}

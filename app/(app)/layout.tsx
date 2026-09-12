import type { ReactNode } from "react";
import BarraInferior from "@/components/shell/BarraInferior";

/*
  Shell común de las pantallas con barra inferior.

  El acceso a Configuración NO vive acá: está dentro del encabezado de Hoy,
  que es la única pantalla que lo muestra. Por eso este layout ya no necesita
  saber en qué ruta está ni recordar la última pestaña visitada.
*/
export default function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* El padding inferior deja el contenido por encima de la barra. */}
      <main className="pb-[calc(env(safe-area-inset-bottom)+92px)]">
        {children}
      </main>
      <BarraInferior />
    </>
  );
}

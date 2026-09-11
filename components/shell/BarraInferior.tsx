"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PESTANAS = [
  { href: "/hoy", etiqueta: "Hoy" },
  { href: "/semana", etiqueta: "Semana" },
  { href: "/progreso", etiqueta: "Progreso" },
  { href: "/menus", etiqueta: "Menús" },
  { href: "/recuperacion", etiqueta: "Recuperación" },
] as const;

export default function BarraInferior() {
  const ruta = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-[42] flex w-full max-w-[430px] -translate-x-1/2 border-t border-linea bg-fondo/94 px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-[12px]">
      {PESTANAS.map((p) => {
        // En /configuracion ninguna pestaña queda activa.
        const activa = ruta === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-[5px] px-0.5 pb-1 pt-2 text-center text-[10.5px] leading-[1.2] ${
              activa ? "font-semibold text-verde" : "font-normal text-tinta-4"
            }`}
          >
            <span
              aria-hidden
              className={`h-[5px] w-[5px] rounded-full ${
                activa ? "bg-verde" : "bg-transparent"
              }`}
            />
            <span className="truncate">{p.etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}

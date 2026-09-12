"use client";

import { useState } from "react";
import { TIEMPOS } from "@/lib/dominio";
import { textoPorciones } from "@/lib/porciones";
import type { Menu } from "@/lib/supabase/tipos";
import HojaMenu from "./HojaMenu";

type Props = { menus: Menu[] };

/** null = hoja cerrada · "nuevo" = crear · un Menu = editar ese. */
type Hoja = null | "nuevo" | Menu;

export default function PantallaMenus({ menus }: Props) {
  const [hoja, setHoja] = useState<Hoja>(null);

  // Agrupado en el orden de TIEMPOS; los grupos vacíos no se muestran.
  // Los menús ya vienen alfabéticos desde la consulta.
  const grupos = TIEMPOS.map((t) => ({
    etiqueta: t.etiqueta,
    items: menus.filter((m) => m.tiempo === t.clave),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* El padding derecho deja libre la esquina del engranaje. */}
      <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
        <div className="flex items-baseline justify-between pr-[52px]">
          <h1 className="font-serif text-[27px] font-medium text-tinta">
            Menús
          </h1>
          <button
            type="button"
            onClick={() => setHoja("nuevo")}
            className="shrink-0 rounded-full border border-verde-borde bg-verde-fondo px-[14px] py-[9px] text-[14px] font-medium text-verde-oscuro"
          >
            Nuevo
          </button>
        </div>

        {grupos.length === 0 ? (
          <p className="mt-6 text-[14.5px] leading-relaxed text-tinta-2">
            Todavía no hay menús. Crea el primero con Nuevo.
          </p>
        ) : (
          <div className="mt-[22px] flex flex-col gap-6">
            {grupos.map((g) => (
              <section key={g.etiqueta}>
                <h2 className="border-b border-linea pb-[9px] text-[12.5px] uppercase tracking-[0.06em] text-tinta-3">
                  {g.etiqueta}
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {g.items.map((m) => (
                    <article
                      key={m.id}
                      className="rounded-tarjeta border border-linea bg-superficie p-4"
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <h3 className="font-serif text-[18.5px] font-medium text-tinta">
                          {m.nombre}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setHoja(m)}
                          className="shrink-0 py-0.5 text-[13.5px] text-verde"
                        >
                          Editar
                        </button>
                      </div>

                      <div className="mt-[9px] flex flex-col gap-[3px]">
                        {m.ingredientes.map((ing, i) => (
                          <span
                            key={i}
                            className="text-[14.5px] leading-snug text-tinta-cuerpo"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>

                      {m.observacion ? (
                        <p className="mt-[9px] text-[13.5px] italic leading-snug text-tinta-3">
                          {m.observacion}
                        </p>
                      ) : null}

                      <p className="mt-[11px] border-t border-linea-suave pt-2.5 font-mono text-[11.5px] leading-relaxed text-tinta-3">
                        {textoPorciones(m.porciones, m.kcal) ||
                          "sin porciones asignadas"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {hoja ? (
        <HojaMenu
          // La key remonta el formulario en cada apertura, así el estado no
          // arrastra lo que se escribió en el menú anterior.
          key={hoja === "nuevo" ? "nuevo" : `${hoja.id}-${hoja.updated_at}`}
          menu={hoja === "nuevo" ? null : hoja}
          onCerrar={() => setHoja(null)}
        />
      ) : null}
    </>
  );
}

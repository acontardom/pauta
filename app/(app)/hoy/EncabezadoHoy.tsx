"use client";

import BotonConfiguracion from "@/components/shell/BotonConfiguracion";
import { GRUPOS } from "@/lib/dominio";
import { formatoLargo } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";
import type { Porciones } from "@/lib/supabase/tipos";
import type { TotalesDia } from "@/lib/dia";

type Props = {
  fecha: string;
  esHoy: boolean;
  metas: Porciones;
  totales: TotalesDia;
  comidasRegistradas: number;
  diaCerrado: boolean;
  onDiaAnterior: () => void;
  onDiaSiguiente: () => void;
  onVolverAHoy: () => void;
};

const MILES = new Intl.NumberFormat("es-CL");

export default function EncabezadoHoy({
  fecha,
  esHoy,
  metas,
  totales,
  comidasRegistradas,
  diaCerrado,
  onDiaAnterior,
  onDiaSiguiente,
  onVolverAHoy,
}: Props) {
  const metaProteicos = metas.proteicos;
  const proteicos = totales.porciones.proteicos ?? 0;

  return (
    <header
      className={`border-b px-5 pb-[14px] pt-[calc(env(safe-area-inset-top)+22px)] ${
        // En un día anterior el encabezado se entona distinto, para que se vea
        // de un golpe que no se está mirando hoy.
        esHoy ? "border-linea bg-fondo" : "border-borde-pasado bg-fondo-pasado"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Día anterior"
          onClick={onDiaAnterior}
          className="h-10 w-10 shrink-0 rounded-control border border-borde bg-superficie text-[20px] leading-none text-tinta-2"
        >
          ‹
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="font-serif text-[20px] font-medium tracking-[-0.01em] text-tinta">
            {formatoLargo(fecha)}
          </div>
          <div className="mt-0.5 flex items-baseline justify-center gap-1.5">
            <span className="text-[12.5px] text-tinta-3">
              {comidasRegistradas === 0
                ? "Sin registros"
                : `${comidasRegistradas} de 5 comidas`}
            </span>
            {metaProteicos != null ? (
              <span className="text-[12.5px] text-verde">
                · {formatear(proteicos)}/{formatear(metaProteicos)} proteicos
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label="Día siguiente"
          onClick={onDiaSiguiente}
          disabled={esHoy}
          className={`h-10 w-10 shrink-0 rounded-control border text-[20px] leading-none ${
            esHoy
              ? "border-borde-apagado bg-superficie-suave text-tinta-apagada"
              : "border-borde bg-superficie text-tinta-2"
          }`}
        >
          ›
        </button>

        {/* ml-1 separa el engranaje del "›" para no confundirlos ni errar el
            toque: quedan a 10px, y el ancho que le queda a la fecha es el
            mismo que antes reservaba el botón fijo. */}
        <BotonConfiguracion className="ml-1" />
      </div>

      <div className="mt-3 flex min-h-6 items-center justify-between gap-2.5">
        {/*
          El estado es descriptivo, nunca un reproche: un día abierto se ve
          igual de neutro que uno en curso.
        */}
        <span
          className={`rounded-[20px] border px-2.5 py-1 text-[12px] uppercase tracking-[0.05em] ${
            diaCerrado
              ? "border-verde-borde bg-verde-fondo text-verde-oscuro"
              : "border-borde bg-transparent text-tinta-4"
          }`}
        >
          {diaCerrado
            ? "Día registrado"
            : esHoy
              ? "Día en curso"
              : "Día abierto"}
        </span>
        {!esHoy ? (
          <button
            type="button"
            onClick={onVolverAHoy}
            className="py-1 text-[13px] text-verde"
          >
            Volver a hoy
          </button>
        ) : null}
      </div>

      {/* Contadores: 7 grupos y kcal, con scroll horizontal. */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
        {GRUPOS.map((g) => {
          const valor = totales.porciones[g.clave] ?? 0;
          const meta = metas[g.clave];
          const cumplida = meta != null && valor >= meta;
          const ancho =
            meta != null && meta > 0 ? Math.min(100, (valor / meta) * 100) : 0;

          return (
            <div
              key={g.clave}
              className="min-w-[72px] shrink-0 rounded-[10px] border border-linea bg-superficie px-2.5 pb-[9px] pt-2"
            >
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-tinta-3">
                {g.corta}
              </div>
              <div className="mt-0.5 font-serif text-[17px] text-tinta">
                {formatear(valor)}/{meta != null ? formatear(meta) : "—"}
              </div>
              <div className="mt-[7px] h-[3px] overflow-hidden rounded-sm bg-barra-vacia">
                {/* Pasarse de la meta no es un error: la barra se llena y ya. */}
                <div
                  className={`h-full ${cumplida ? "bg-verde" : "bg-verde-barra"}`}
                  style={{ width: `${ancho}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="min-w-[72px] shrink-0 rounded-[10px] border border-linea bg-superficie px-2.5 pb-[9px] pt-2">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-tinta-3">
            Kcal
          </div>
          <div className="mt-0.5 font-serif text-[17px] text-tinta">
            {totales.comidasConKcal === 0
              ? "—"
              : `≈${MILES.format(totales.kcal)}`}
          </div>
        </div>
      </div>
    </header>
  );
}

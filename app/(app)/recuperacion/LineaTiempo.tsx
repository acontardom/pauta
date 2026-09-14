"use client";

import { useState } from "react";
import Segmentos from "@/components/ui/Segmentos";
import { formatoCorto } from "@/lib/fechas";
import { lineaTiempo, type ItemLinea, type TonoNota } from "@/lib/recuperacion";
import type { EntradaRecuperacion, Hito } from "@/lib/supabase/tipos";

type Filtro = "todo" | "controles" | "kine";

type Props = {
  hitos: Hito[];
  entradas: EntradaRecuperacion[];
  /** Para calcular el control agendado y su distancia. */
  hoy: string;
  onAbrirHito: (hito: Hito) => void;
  onAbrirEntrada: (entrada: EntradaRecuperacion) => void;
  onNuevoHito: () => void;
};

/* Adelantar en verde, atrasar en ámbar, lo demás neutro. Nunca rojo. */
const TONO_NOTA: Record<TonoNota, string> = {
  bueno: "text-verde",
  ambar: "text-ambar",
  neutro: "text-tinta-3",
};

const TRAZO = "bg-borde-suave";

export default function LineaTiempo({
  hitos,
  entradas,
  hoy,
  onAbrirHito,
  onAbrirEntrada,
  onNuevoHito,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todo");

  // "Controles" muestra controles e hitos: los hitos se deciden en los controles.
  // El control agendado es del grupo "control": aparece en Todo y en Controles.
  const items = lineaTiempo(hitos, entradas, hoy).filter((item) =>
    filtro === "todo"
      ? true
      : filtro === "controles"
        ? item.grupo === "control" || item.grupo === "hito"
        : item.grupo === "kine",
  );

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-[22px] font-medium text-tinta">
          Línea de tiempo
        </h2>
        <button
          type="button"
          onClick={onNuevoHito}
          className="py-1 text-[13.5px] text-verde"
        >
          Nuevo hito
        </button>
      </div>

      <Segmentos
        className="mb-3.5"
        valor={filtro}
        onChange={setFiltro}
        opciones={[
          { valor: "todo", etiqueta: "Todo" },
          { valor: "controles", etiqueta: "Controles" },
          { valor: "kine", etiqueta: "Kinesiología" },
        ]}
      />

      {items.length === 0 ? (
        <p className="text-[14.5px] leading-relaxed text-tinta-2">
          No hay registros con este filtro.
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((item, i) => (
            <Fila
              key={item.clave}
              item={item}
              primero={i === 0}
              ultimo={i === items.length - 1}
              onAbrir={() =>
                item.origen.tipo === "hito"
                  ? onAbrirHito(item.origen.hito)
                  : onAbrirEntrada(item.origen.entrada)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Fila({
  item,
  primero,
  ultimo,
  onAbrir,
}: {
  item: ItemLinea;
  primero: boolean;
  ultimo: boolean;
  onAbrir: () => void;
}) {
  const esKine = item.grupo === "kine";

  return (
    // items-stretch: la columna de la línea mide lo mismo que la tarjeta, y el
    // margen inferior de la tarjeta queda dentro de la fila, así el trazo
    // corre sin cortes hasta el punto siguiente.
    <div className="flex items-stretch gap-3">
      <div className="flex w-[18px] shrink-0 flex-col items-center" aria-hidden>
        {/* Antes del primer ítem y después del último no hay línea. */}
        <span className={`h-2.5 w-0.5 shrink-0 ${primero ? "" : TRAZO}`} />
        <Punto item={item} />
        <span
          className={`w-0.5 flex-1 ${esKine ? "min-h-1.5" : "min-h-3.5"} ${
            ultimo ? "" : TRAZO
          }`}
        />
      </div>

      {item.grupo === "hito" ? (
        <TarjetaHito item={item} onAbrir={onAbrir} />
      ) : item.agendado ? (
        <TarjetaAgendado item={item} onAbrir={onAbrir} />
      ) : esKine ? (
        <TarjetaKine item={item} onAbrir={onAbrir} />
      ) : (
        <TarjetaEntrada item={item} onAbrir={onAbrir} />
      )}
    </div>
  );
}

function Punto({ item }: { item: ItemLinea }) {
  // Hueco como el de un hito planificado, en el azul de los controles.
  if (item.agendado) {
    return (
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-azul bg-fondo" />
    );
  }
  if (item.grupo === "hito") {
    return (
      <span
        className={`h-3 w-3 shrink-0 rounded-full border-2 ${
          item.destacado ? "border-verde bg-verde" : "border-borde-fuerte bg-fondo"
        }`}
      />
    );
  }
  if (item.grupo === "kine") {
    return (
      <span
        className={`h-[7px] w-[7px] shrink-0 rounded-full ${
          item.destacado ? "bg-verde" : "bg-borde-fuerte"
        }`}
      />
    );
  }
  return (
    <span
      className={`h-[9px] w-[9px] shrink-0 rounded-full ${
        item.grupo === "control" ? "bg-azul" : "bg-tinta-6"
      }`}
    />
  );
}

function Fecha({ fecha }: { fecha: string | null }) {
  return (
    <span className="shrink-0 whitespace-nowrap text-[12px] text-tinta-4">
      {fecha ? formatoCorto(fecha) : "sin fecha"}
    </span>
  );
}

const TOQUE = "min-w-0 flex-1 text-left transition-transform active:scale-[0.995]";

function TarjetaHito({ item, onAbrir }: { item: ItemLinea; onAbrir: () => void }) {
  const cumplido = item.destacado;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`${TOQUE} mb-2.5 rounded-tarjeta border px-[15px] py-3.5 ${
        cumplido
          ? "border-verde-borde bg-verde-fondo-2"
          : "border-dashed border-borde-fuerte bg-superficie"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span
          className={`min-w-0 font-serif text-[17.5px] font-medium ${
            cumplido ? "text-tinta" : "text-tinta-2"
          }`}
        >
          {item.titulo}
        </span>
        <Fecha fecha={item.fecha} />
      </div>
      <p
        className={`mt-[5px] text-[11.5px] uppercase tracking-[0.05em] ${
          cumplido ? "text-verde-oscuro" : "text-tinta-5"
        }`}
      >
        {item.tipo}
      </p>
      {item.notaHito?.texto ? (
        <p
          className={`mt-2 border-t border-linea-suave pt-2 text-[12.5px] leading-snug ${
            TONO_NOTA[item.notaHito.tono]
          }`}
        >
          {item.notaHito.texto}
        </p>
      ) : null}
    </button>
  );
}

/*
  El próximo control, antes de que ocurra. Se ve como un hito planificado
  (borde punteado, fondo blanco) pero en azul, el color de los controles, para
  distinguirlo a simple vista de los controles ya registrados. No se edita:
  abre la hoja del control que lo agendó.
*/
function TarjetaAgendado({ item, onAbrir }: { item: ItemLinea; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`${TOQUE} mb-2.5 rounded-tarjeta border border-dashed border-azul-claro bg-superficie px-[15px] py-3.5`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="min-w-0 font-serif text-[17.5px] font-medium text-tinta-2">
          {item.titulo}
        </span>
        <Fecha fecha={item.fecha} />
      </div>
      <p className="mt-[5px] text-[11.5px] uppercase tracking-[0.05em] text-azul-texto">
        {item.tipo}
      </p>
      {item.lineas.map((linea, i) => (
        <p key={i} className="mt-1.5 text-[14px] leading-snug text-tinta-2">
          {linea}
        </p>
      ))}
    </button>
  );
}

/*
  Una sesión sin autorizaciones nuevas va sin fondo ni borde y en tinta apagada:
  es una sesión más, no una falla.
*/
function TarjetaKine({ item, onAbrir }: { item: ItemLinea; onAbrir: () => void }) {
  const conNovedades = item.destacado;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`${TOQUE} mb-1.5 rounded-[10px] border px-[11px] py-2 ${
        conNovedades
          ? "border-verde-borde bg-verde-fondo-2"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span
          className={`min-w-0 text-[14.5px] leading-snug ${
            conNovedades ? "font-medium text-verde-oscuro" : "text-tinta-5"
          }`}
        >
          {item.titulo}
        </span>
        <Fecha fecha={item.fecha} />
      </div>
    </button>
  );
}

function TarjetaEntrada({ item, onAbrir }: { item: ItemLinea; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`${TOQUE} mb-2.5 rounded-tarjeta border border-l-[3px] border-linea bg-superficie px-[15px] py-3.5 ${
        item.grupo === "control" ? "border-l-azul" : "border-l-tinta-6"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="min-w-0 font-serif text-[17.5px] font-medium text-tinta">
          {item.titulo}
        </span>
        <Fecha fecha={item.fecha} />
      </div>
      <p className="mt-[5px] text-[11.5px] uppercase tracking-[0.05em] text-tinta-3">
        {item.tipo}
      </p>
      {item.lineas.map((linea, i) => (
        <p key={i} className="mt-1.5 text-[14px] leading-snug text-tinta-cuerpo">
          {linea}
        </p>
      ))}
    </button>
  );
}

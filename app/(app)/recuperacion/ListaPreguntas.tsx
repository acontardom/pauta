"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import CampoTexto from "@/components/ui/CampoTexto";
import { formatoDiaMes } from "@/lib/fechas";
import { ordenarPreguntas } from "@/lib/recuperacion";
import type { PreguntaControl } from "@/lib/supabase/tipos";
import { MAXIMO_PREGUNTA, validarPregunta } from "@/lib/validarPregunta";
import { agregarPregunta, alternarPregunta, eliminarPregunta } from "./acciones";

type Props = {
  preguntas: PreguntaControl[];
  proximoControl: string | null;
};

type Accion =
  | { tipo: "agregar"; pregunta: PreguntaControl }
  | { tipo: "alternar"; id: string; preguntada: boolean }
  | { tipo: "eliminar"; id: string };

const AVISO_FALLO = "No se pudo guardar. Intenta de nuevo.";

export default function ListaPreguntas({ preguntas, proximoControl }: Props) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [, iniciar] = useTransition();

  /*
    Igual que en Hoy: el cambio se ve antes de que responda el servidor. Si la
    acción falla, React descarta este estado y la lista vuelve a la del
    servidor, con un aviso que explica por qué.
  */
  const [vista, aplicar] = useOptimistic(
    preguntas,
    (estado: PreguntaControl[], accion: Accion) => {
      switch (accion.tipo) {
        case "agregar":
          return [...estado, accion.pregunta];
        case "alternar":
          return estado.map((p) =>
            p.id === accion.id ? { ...p, preguntada: accion.preguntada } : p,
          );
        case "eliminar":
          return estado.filter((p) => p.id !== accion.id);
      }
    },
  );

  function ejecutar(
    optimista: Accion,
    accion: () => Promise<{ ok: boolean }>,
    alFallar?: () => void,
  ) {
    setAviso("");
    iniciar(async () => {
      aplicar(optimista);
      const r = await accion();
      if (!r.ok) {
        setAviso(AVISO_FALLO);
        alFallar?.();
      }
    });
  }

  // Un <form> hace que Enter en el campo agregue la pregunta, también desde el
  // botón "ir" del teclado de iOS.
  function agregar(e: FormEvent) {
    e.preventDefault();
    const v = validarPregunta(texto);
    if (!v.ok) return;

    setTexto("");
    ejecutar(
      {
        tipo: "agregar",
        pregunta: {
          id: `optimista-${Date.now()}`,
          user_id: "",
          created_at: new Date().toISOString(),
          updated_at: "",
          texto: v.texto,
          preguntada: false,
        },
      },
      () => agregarPregunta(v.texto),
      // Si no se guardó, lo escrito vuelve al campo en vez de perderse.
      () => setTexto((actual) => actual || v.texto),
    );
  }

  const ordenadas = ordenarPreguntas(vista);

  return (
    <section>
      <h2 className="mb-3 mt-7 border-b border-linea pb-[9px] text-[12.5px] uppercase tracking-[0.06em] text-tinta-3">
        Preguntas para el próximo control
      </h2>
      <p className="mb-3 text-[13px] text-tinta-3">
        {proximoControl
          ? `Para el control del ${formatoDiaMes(proximoControl)}`
          : "Sin próximo control agendado."}
      </p>

      <form onSubmit={agregar} className="flex items-center gap-2">
        <CampoTexto
          etiqueta="Nueva pregunta"
          etiquetaOculta
          valor={texto}
          onChange={setTexto}
          placeholder="¿Puedo empezar bicicleta de pie?"
          maxLength={MAXIMO_PREGUNTA}
          className="min-w-0 flex-1"
        />
        <button
          type="submit"
          aria-label="Agregar pregunta"
          disabled={texto.trim() === ""}
          className="h-[52px] w-14 shrink-0 rounded-control border border-verde-borde bg-verde-fondo p-0 text-[22px] text-verde-oscuro disabled:opacity-50"
        >
          +
        </button>
      </form>

      {aviso ? (
        <p role="status" className="mt-2.5 text-[13.5px] text-tinta-2">
          {aviso}
        </p>
      ) : null}

      {ordenadas.length === 0 ? (
        <p className="mt-3 text-[14.5px] leading-relaxed text-tinta-2">
          Todavía no hay preguntas anotadas.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {ordenadas.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-linea bg-superficie px-3.5 py-3"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={p.preguntada}
                aria-label={p.preguntada ? "Marcar como pendiente" : "Marcar como preguntada"}
                onClick={() =>
                  ejecutar(
                    { tipo: "alternar", id: p.id, preguntada: !p.preguntada },
                    () => alternarPregunta(p.id, !p.preguntada),
                  )
                }
                className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border p-0 ${
                  p.preguntada ? "border-verde bg-verde" : "border-borde bg-superficie"
                }`}
              >
                {p.preguntada ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                    aria-hidden
                  >
                    <path d="M3 7.5l2.5 2.5L11 4.5" />
                  </svg>
                ) : null}
              </button>

              <span
                className={`min-w-0 flex-1 text-[14.5px] leading-snug ${
                  p.preguntada ? "text-tinta-4 line-through" : "text-tinta-fila"
                }`}
              >
                {p.texto}
              </span>

              {/* Sin confirmación: quitar una pregunta anotada es liviano. */}
              <button
                type="button"
                onClick={() =>
                  ejecutar({ tipo: "eliminar", id: p.id }, () => eliminarPregunta(p.id))
                }
                className="shrink-0 py-1.5 text-[13px] text-tinta-4"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

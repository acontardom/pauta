"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import { CAMPOS_INBODY, type ClaveInbody } from "@/lib/dominio";
import { tarjetasInbody, type TonoInbody } from "@/lib/progreso";
import { llamarAccion } from "@/lib/red";
import type { Inbody } from "@/lib/supabase/tipos";
import { actualizarInbody, eliminarInbody, guardarInbody } from "./acciones";

type Props = {
  mediciones: Inbody[];
  hoy: string;
  /** null = cerrado · "nuevo" · una medición = editar esa. */
  form: null | "nuevo" | Inbody;
  onAbrirNuevo: () => void;
  onEditar: (medicion: Inbody) => void;
  /** "Cancelar" del encabezado: pasa por la confirmación si hay cambios. */
  onCancelar: () => void;
  /** Después de guardar o eliminar: cierra directo. */
  onCerrar: () => void;
  /** El formulario avisa si tiene algo escrito sin guardar. */
  onCambios: (hayCambios: boolean) => void;
};

/*
  Bueno en verde, malo en ámbar, sin cambio en tinta-3.
  "Malo" existe acá porque perder masa musculoesquelética va contra la meta,
  pero se muestra en ámbar, el color de atención. Nunca en rojo.
*/
const TONO: Record<TonoInbody, string> = {
  bueno: "font-semibold text-verde",
  malo: "font-semibold text-ambar",
  neutro: "font-normal text-tinta-3",
};

export default function SeccionInbody({
  mediciones,
  hoy,
  form,
  onAbrirNuevo,
  onEditar,
  onCancelar,
  onCerrar,
  onCambios,
}: Props) {
  const refFormulario = useRef<HTMLDivElement>(null);
  const tarjetas = tarjetasInbody(mediciones);

  /*
    Al abrir el formulario la vista baja hasta él. Importa sobre todo al editar
    una medición del final: el formulario queda lejos de donde se tocó.
  */
  const claveFormulario =
    form === null ? null : form === "nuevo" ? "nuevo" : `${form.id}-${form.updated_at}`;

  useEffect(() => {
    if (claveFormulario) {
      refFormulario.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [claveFormulario]);

  return (
    <section className="mt-7">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-serif text-[22px] font-medium text-tinta">InBody</h2>
        <button
          type="button"
          onClick={form ? onCancelar : onAbrirNuevo}
          className="py-1 text-[13.5px] text-verde"
        >
          {form ? "Cancelar" : "Agregar medición"}
        </button>
      </div>

      {form && claveFormulario ? (
        <div ref={refFormulario} className="mb-3 scroll-mt-4">
          <FormularioInbody
            // La key remonta el formulario: cambiar de medición no arrastra
            // lo escrito, y al cerrarse queda limpio para la próxima vez.
            key={claveFormulario}
            medicion={form === "nuevo" ? null : form}
            hoy={hoy}
            onCerrar={onCerrar}
            onCambios={onCambios}
          />
        </div>
      ) : null}

      {tarjetas.length === 0 ? (
        <p className="text-[14.5px] leading-relaxed text-tinta-2">
          Todavía no hay mediciones InBody.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tarjetas.map((t) => (
            <article
              key={t.medicion.id}
              className="rounded-tarjeta border border-linea bg-superficie p-4"
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <h3 className="font-serif text-[18px] text-tinta">{t.titulo}</h3>
                <div className="flex shrink-0 items-baseline gap-3">
                  <span className="text-[12px] text-tinta-4">{t.referencia}</span>
                  <button
                    type="button"
                    onClick={() => onEditar(t.medicion)}
                    className="py-0.5 text-[13.5px] text-verde"
                  >
                    Editar
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex flex-col">
                {t.filas.map((f, i) => (
                  <div
                    key={f.clave}
                    className={`flex items-baseline justify-between gap-2.5 py-[9px] ${
                      i > 0 ? "border-t border-linea-suave" : ""
                    } ${f.destacada ? "-mx-2 rounded-lg bg-superficie-suave px-2" : ""}`}
                  >
                    <span
                      className={`min-w-0 text-[14px] text-tinta-cuerpo ${
                        f.destacada ? "font-semibold" : ""
                      }`}
                    >
                      {f.etiqueta}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2.5">
                      <span className="font-serif text-[17px] text-tinta">
                        {f.valor}
                      </span>
                      {/* Ancho mínimo: los valores quedan alineados aunque no haya delta. */}
                      <span
                        className={`min-w-[44px] text-right text-[12.5px] ${TONO[f.delta.tono]}`}
                      >
                        {f.delta.texto}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FormularioInbody({
  medicion,
  hoy,
  onCerrar,
  onCambios,
}: {
  medicion: Inbody | null;
  hoy: string;
  onCerrar: () => void;
  onCambios: (hayCambios: boolean) => void;
}) {
  const editando = medicion !== null;
  const idFecha = useId();

  const fechaInicial = medicion?.fecha ?? hoy;
  const [fecha, setFecha] = useState(fechaInicial);
  // Los valores al abrir: contra esto se miden los cambios.
  const [valoresIniciales] = useState<Record<ClaveInbody, string>>(() => {
    const inicial = {} as Record<ClaveInbody, string>;
    for (const campo of CAMPOS_INBODY) {
      const v = medicion?.[campo.clave];
      inicial[campo.clave] = v != null ? String(v).replace(".", ",") : "";
    }
    return inicial;
  });
  const [valores, setValores] = useState(valoresIniciales);

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciarGuardado] = useTransition();
  const [eliminando, iniciarEliminado] = useTransition();

  const ocupado = guardando || eliminando;
  const todosVacios = CAMPOS_INBODY.every((c) => valores[c.clave].trim() === "");
  const hayCambios =
    fecha !== fechaInicial ||
    CAMPOS_INBODY.some((c) => valores[c.clave] !== valoresIniciales[c.clave]);

  /*
    El formulario es en línea, no una hoja: lo cierran o lo reemplazan botones
    de Progreso. Por eso avisa hacia arriba si tiene cambios, y al desmontarse
    deja de tenerlos.
  */
  useEffect(() => {
    onCambios(hayCambios);
  }, [hayCambios, onCambios]);
  useEffect(() => () => onCambios(false), [onCambios]);

  function guardar() {
    setError("");
    iniciarGuardado(async () => {
      const entrada = { fecha, valores };
      const r = await llamarAccion(() =>
        editando ? actualizarInbody(medicion.id, entrada) : guardarInbody(entrada),
      );
      // Si falla, el formulario queda abierto con lo escrito.
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  function eliminar() {
    setError("");
    iniciarEliminado(async () => {
      const r = await llamarAccion(() => eliminarInbody(medicion!.id));
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  return (
    <div className="rounded-tarjeta border border-linea bg-superficie p-4">
      <label htmlFor={idFecha} className="block text-[11.5px] text-tinta-3">
        Fecha
      </label>
      <input
        id={idFecha}
        type="date"
        value={fecha}
        // El tope impide elegir mañana desde el selector; el servidor valida igual.
        max={hoy}
        onChange={(e) => setFecha(e.target.value)}
        className="mt-1.5 h-[50px] w-full rounded-control border border-borde bg-fondo px-[11px] font-serif text-[19px] text-tinta focus:border-verde-borde focus:outline-none"
      />

      {/* items-end: si una etiqueta larga ocupa dos líneas, los campos siguen
          alineados por abajo. */}
      <div className="mt-3 grid grid-cols-2 items-end gap-2.5">
        {CAMPOS_INBODY.map((campo) => (
          <CampoNumerico
            key={campo.clave}
            etiqueta={`${campo.etiqueta} (${campo.unidad})`}
            valor={valores[campo.clave]}
            onChange={(v) =>
              setValores((previo) => ({ ...previo, [campo.clave]: v }))
            }
            modo="decimal"
            tamano="compacto"
          />
        ))}
      </div>

      <Boton
        variante="secundaria"
        className="mt-3.5"
        onClick={guardar}
        disabled={todosVacios || ocupado}
      >
        {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar medición"}
      </Boton>

      {error ? (
        <p role="status" className="mt-2.5 text-[13.5px] leading-relaxed text-tinta-2">
          {error}
        </p>
      ) : null}

      {editando ? (
        confirmando ? (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <p className="text-[13.5px] leading-relaxed text-tinta-2">
              ¿Eliminar esta medición?
            </p>
            <Boton variante="secundaria" onClick={eliminar} disabled={ocupado}>
              {eliminando ? "Eliminando…" : "Eliminar"}
            </Boton>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={ocupado}
              className="h-[46px] text-[13.5px] text-tinta-3"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={ocupado}
            className="mt-1 h-[46px] w-full text-[13.5px] text-tinta-4"
          >
            Eliminar esta medición
          </button>
        )
      ) : null}
    </div>
  );
}

"use client";

import { useId, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoTexto from "@/components/ui/CampoTexto";
import HojaInferior from "@/components/ui/HojaInferior";
import { diferenciaCumplimiento, textoHistorial } from "@/lib/recuperacion";
import { llamarAccion } from "@/lib/red";
import type { Hito } from "@/lib/supabase/tipos";
import { MAXIMO_NOMBRE_HITO } from "@/lib/validarHito";
import { actualizarHito, eliminarHito, guardarHito } from "./acciones";

type Props = {
  /** El hito a editar, o null para crear uno nuevo. */
  hito: Hito | null;
  hoy: string;
  onCerrar: () => void;
};

const CLASE_FECHA =
  "mt-1.5 h-[54px] w-full rounded-control border border-borde bg-superficie px-[14px] font-serif text-[19px] text-tinta focus:border-verde-borde focus:outline-none";

export default function HojaHito({ hito, hoy, onCerrar }: Props) {
  const editando = hito !== null;
  const idPlanificada = useId();
  const idReal = useId();

  const [nombre, setNombre] = useState(hito?.nombre ?? "");
  const [planificada, setPlanificada] = useState(hito?.fecha_planificada ?? "");
  const [cumplido, setCumplido] = useState(hito?.cumplido ?? false);
  const [real, setReal] = useState(hito?.fecha_real ?? hoy);
  const [motivo, setMotivo] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciarGuardado] = useTransition();
  const [eliminando, iniciarEliminado] = useTransition();
  const ocupada = guardando || eliminando;

  // El motivo se pide solo si el hito YA tenía fecha y ahora es otra.
  const cambioDeFecha =
    editando &&
    hito.fecha_planificada != null &&
    (planificada || null) !== hito.fecha_planificada;

  const diferencia = cumplido
    ? diferenciaCumplimiento(planificada || null, real || null)
    : null;

  const historial = textoHistorial(hito?.historial);
  // Los hitos fijos (los de la semilla) no se pueden eliminar.
  const puedeEliminar = editando && !hito.fijo;

  function guardar() {
    setError("");
    iniciarGuardado(async () => {
      const datos = {
        nombre,
        fecha_planificada: planificada || null,
        fecha_real: cumplido ? real || null : null,
        cumplido,
        motivo: cambioDeFecha ? motivo : null,
      };
      const r = await llamarAccion(() =>
        editando ? actualizarHito(hito.id, datos) : guardarHito(datos),
      );
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  function eliminar() {
    setError("");
    iniciarEliminado(async () => {
      const r = await llamarAccion(() => eliminarHito(hito!.id));
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={editando ? "Editar hito" : "Nuevo hito"}
    >
      <div className="flex flex-col gap-3.5">
        <CampoTexto
          etiqueta="Nombre del hito"
          valor={nombre}
          onChange={setNombre}
          placeholder="Inicio de carga completa"
          maxLength={MAXIMO_NOMBRE_HITO}
        />

        <div>
          <label htmlFor={idPlanificada} className="block text-[12.5px] text-tinta-3">
            Fecha planificada (opcional)
          </label>
          {/* Sin tope: un hito planificado es, casi siempre, futuro. */}
          <input
            id={idPlanificada}
            type="date"
            value={planificada}
            onChange={(e) => setPlanificada(e.target.value)}
            className={CLASE_FECHA}
          />
        </div>

        {cambioDeFecha ? (
          <CampoTexto
            etiqueta="Motivo del cambio"
            valor={motivo}
            onChange={setMotivo}
            placeholder="Opcional: queda en el historial"
            maxLength={120}
          />
        ) : null}

        <div className="rounded-xl border border-linea bg-superficie p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] text-tinta-fila">Ya se cumplió</span>
            <button
              type="button"
              role="switch"
              aria-checked={cumplido}
              onClick={() => setCumplido((v) => !v)}
              className={`h-[42px] w-[84px] shrink-0 rounded-control border text-[14.5px] font-medium ${
                cumplido
                  ? "border-verde-borde bg-verde-fondo text-verde-oscuro"
                  : "border-borde bg-fondo text-tinta-2"
              }`}
            >
              {cumplido ? "Sí" : "No"}
            </button>
          </div>

          {cumplido ? (
            <div className="mt-3">
              <label htmlFor={idReal} className="block text-[12.5px] text-tinta-3">
                Fecha real
              </label>
              <input
                id={idReal}
                type="date"
                value={real}
                onChange={(e) => setReal(e.target.value)}
                className={`${CLASE_FECHA} bg-fondo`}
              />
              {diferencia?.texto ? (
                <p
                  className={`mt-2 text-[13px] ${
                    // Adelantarse va en verde; atrasarse, en tinta normal. Nunca rojo.
                    diferencia.tono === "bueno" ? "text-verde" : "text-tinta-2"
                  }`}
                >
                  {diferencia.texto}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {historial.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {historial.map((linea, i) => (
              <p key={i} className="text-[12.5px] leading-relaxed text-tinta-3">
                {linea}
              </p>
            ))}
          </div>
        ) : null}

        <Boton onClick={guardar} disabled={nombre.trim() === "" || ocupada}>
          {guardando ? "Guardando…" : "Guardar hito"}
        </Boton>

        {error ? (
          <p role="status" className="text-[13.5px] leading-relaxed text-tinta-2">
            {error}
          </p>
        ) : null}

        {puedeEliminar ? (
          confirmando ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <p className="text-[13.5px] leading-relaxed text-tinta-2">
                ¿Eliminar este hito?
              </p>
              <Boton variante="secundaria" onClick={eliminar} disabled={ocupada}>
                {eliminando ? "Eliminando…" : "Eliminar"}
              </Boton>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={ocupada}
                className="h-[46px] text-[13.5px] text-tinta-3"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={ocupada}
              className="h-[46px] text-[13.5px] text-tinta-4"
            >
              Eliminar hito
            </button>
          )
        ) : null}
      </div>
    </HojaInferior>
  );
}

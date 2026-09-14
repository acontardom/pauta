"use client";

import { useId, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import HojaInferior from "@/components/ui/HojaInferior";
import { formatoLargoConAnio } from "@/lib/fechas";
import { llamarAccion } from "@/lib/red";
import type { Medida } from "@/lib/supabase/tipos";
import { actualizarMedida, eliminarMedida, guardarMedida } from "./acciones";

type Props = {
  /** El registro a editar, o null para crear uno nuevo. */
  medida: Medida | null;
  /** Hoy en Chile: tope del input de fecha y valor por defecto. */
  hoy: string;
  onCerrar: () => void;
};

export default function HojaMedida({ medida, hoy, onCerrar }: Props) {
  const editando = medida !== null;
  const idFecha = useId();

  // Lo que muestra el formulario al abrirse: contra esto se miden los cambios.
  const inicial = {
    fecha: medida?.fecha ?? hoy,
    peso: medida?.peso != null ? String(medida.peso).replace(".", ",") : "",
    cintura:
      medida?.cintura != null ? String(medida.cintura).replace(".", ",") : "",
  };

  const [fecha, setFecha] = useState(inicial.fecha);
  const [peso, setPeso] = useState(inicial.peso);
  const [cintura, setCintura] = useState(inicial.cintura);

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciarGuardado] = useTransition();
  const [eliminando, iniciarEliminado] = useTransition();

  const ocupada = guardando || eliminando;
  const vacios = peso.trim() === "" && cintura.trim() === "";
  const hayCambios =
    fecha !== inicial.fecha ||
    peso !== inicial.peso ||
    cintura !== inicial.cintura;

  function guardar() {
    setError("");
    iniciarGuardado(async () => {
      const entrada = { fecha, peso, cintura };
      const r = await llamarAccion(() =>
        editando ? actualizarMedida(medida.id, entrada) : guardarMedida(entrada),
      );
      // Si falla, la hoja queda abierta con lo escrito adentro.
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  function eliminar() {
    setError("");
    iniciarEliminado(async () => {
      const r = await llamarAccion(() => eliminarMedida(medida!.id));
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={editando ? "Editar registro" : "Nueva medida"}
      subtitulo={editando ? formatoLargoConAnio(medida.fecha) : undefined}
      hayCambios={hayCambios}
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <label
            htmlFor={idFecha}
            className="block text-[12.5px] text-tinta-3"
          >
            Fecha
          </label>
          <input
            id={idFecha}
            type="date"
            value={fecha}
            // El tope impide elegir mañana desde el propio selector de iOS;
            // el servidor lo vuelve a validar igual.
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1.5 h-[54px] w-full rounded-control border border-borde bg-superficie px-[14px] font-serif text-[19px] text-tinta focus:border-verde-borde focus:outline-none"
          />
        </div>

        {/* Decimal, no entero: el teclado chileno escribe coma. */}
        <CampoNumerico
          etiqueta="Peso (kg)"
          valor={peso}
          onChange={setPeso}
          modo="decimal"
          tamano="grande"
        />
        <CampoNumerico
          etiqueta="Cintura (cm)"
          valor={cintura}
          onChange={setCintura}
          modo="decimal"
          tamano="grande"
        />

        <p className="px-0.5 text-[13.5px] leading-relaxed text-tinta-3">
          Puedes guardar solo uno de los dos.
        </p>

        <Boton onClick={guardar} disabled={vacios || ocupada}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar"}
        </Boton>

        {error ? (
          <p role="status" className="text-[13.5px] leading-relaxed text-tinta-2">
            {error}
          </p>
        ) : null}

        {editando ? (
          confirmando ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <p className="text-[13.5px] leading-relaxed text-tinta-2">
                ¿Eliminar este registro?
              </p>
              <Boton
                variante="secundaria"
                onClick={eliminar}
                disabled={ocupada}
              >
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
              Eliminar este registro
            </button>
          )
        ) : null}
      </div>
    </HojaInferior>
  );
}

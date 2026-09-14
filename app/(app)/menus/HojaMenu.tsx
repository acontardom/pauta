"use client";

import { useState, useTransition } from "react";
import SelectorPorciones from "@/components/porciones/SelectorPorciones";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import CampoTexto from "@/components/ui/CampoTexto";
import Chip from "@/components/ui/Chip";
import HojaInferior from "@/components/ui/HojaInferior";
import { TIEMPOS } from "@/lib/dominio";
import { parsear } from "@/lib/numeros";
import { porcionesIguales } from "@/lib/porciones";
import { llamarAccion } from "@/lib/red";
import type { Menu, Porciones } from "@/lib/supabase/tipos";
import { MAXIMO_NOMBRE, type EntradaMenu } from "@/lib/validarMenu";
import { actualizarMenu, crearMenu, eliminarMenu } from "./acciones";

type Props = {
  /** El menú a editar, o null para crear uno nuevo. */
  menu: Menu | null;
  onCerrar: () => void;
};

export default function HojaMenu({ menu, onCerrar }: Props) {
  const editando = menu !== null;

  // Lo que muestra el formulario al abrirse: contra esto se miden los cambios.
  const inicial = {
    nombre: menu?.nombre ?? "",
    tiempo: menu?.tiempo ?? "almuerzo",
    ingredientes: (menu?.ingredientes ?? []).join("\n"),
    observacion: menu?.observacion ?? "",
    kcal: menu?.kcal != null ? String(menu.kcal) : "",
  };

  const [nombre, setNombre] = useState(inicial.nombre);
  const [tiempo, setTiempo] = useState<string>(inicial.tiempo);
  const [ingredientes, setIngredientes] = useState(inicial.ingredientes);
  const [observacion, setObservacion] = useState(inicial.observacion);
  const [porciones, setPorciones] = useState<Porciones>(
    () => ({ ...(menu?.porciones ?? {}) }),
  );
  const [kcal, setKcal] = useState(inicial.kcal);

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciarGuardado] = useTransition();
  const [eliminando, iniciarEliminado] = useTransition();

  const ocupada = guardando || eliminando;

  const hayCambios =
    nombre !== inicial.nombre ||
    tiempo !== inicial.tiempo ||
    ingredientes !== inicial.ingredientes ||
    observacion !== inicial.observacion ||
    kcal !== inicial.kcal ||
    !porcionesIguales(porciones, menu?.porciones);

  function entrada(): EntradaMenu {
    const n = parsear(kcal);
    return {
      nombre,
      tiempo,
      ingredientes,
      observacion,
      porciones,
      kcal: n != null && Number.isInteger(n) && n >= 0 ? n : null,
    };
  }

  function guardar() {
    setError("");
    iniciarGuardado(async () => {
      const r = await llamarAccion(() =>
        editando ? actualizarMenu(menu.id, entrada()) : crearMenu(entrada()),
      );
      // Si falla, la hoja queda abierta con todo lo escrito adentro.
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  function eliminar() {
    setError("");
    iniciarEliminado(async () => {
      const r = await llamarAccion(() => eliminarMenu(menu!.id));
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={editando ? "Editar menú" : "Nuevo menú"}
      hayCambios={hayCambios}
    >
      <div className="flex flex-col gap-3.5">
        <CampoTexto
          etiqueta="Nombre"
          valor={nombre}
          onChange={setNombre}
          placeholder="Pollo con arroz"
          maxLength={MAXIMO_NOMBRE}
        />

        <div>
          <span className="block text-[12.5px] text-tinta-3">
            Tiempo de comida
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TIEMPOS.map((t) => (
              <Chip
                key={t.clave}
                etiqueta={t.etiqueta}
                encendido={tiempo === t.clave}
                // Selección única: no se puede desmarcar, siempre hay uno.
                onToggle={() => setTiempo(t.clave)}
              />
            ))}
          </div>
        </div>

        <CampoTexto
          etiqueta="Ingredientes, uno por línea"
          valor={ingredientes}
          onChange={setIngredientes}
          placeholder={"150 g pollo\n1 taza arroz cocido"}
          variante="area"
        />

        <CampoTexto
          etiqueta="Observación"
          valor={observacion}
          onChange={setObservacion}
          placeholder="Pesar el pollo al servirse"
        />

        <div>
          <span className="mb-2 block text-[12.5px] text-tinta-3">
            Porciones que aporta
          </span>
          {/* Sin metas ni equivalencias: un menú no se compara con el día. */}
          <SelectorPorciones valor={porciones} onChange={setPorciones} />
        </div>

        <CampoNumerico
          etiqueta="Calorías del menú (kcal)"
          valor={kcal}
          onChange={setKcal}
          modo="entero"
        />

        <Boton
          onClick={guardar}
          disabled={nombre.trim().length === 0 || ocupada}
        >
          {guardando
            ? "Guardando…"
            : editando
              ? "Guardar cambios"
              : "Guardar menú"}
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
                ¿Eliminar este menú? Los días ya registrados no cambian.
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
              Eliminar menú
            </button>
          )
        ) : null}
      </div>
    </HojaInferior>
  );
}

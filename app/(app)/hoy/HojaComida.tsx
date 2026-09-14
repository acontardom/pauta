"use client";

import { useMemo, useState } from "react";
import SelectorPorciones from "@/components/porciones/SelectorPorciones";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import CampoTexto from "@/components/ui/CampoTexto";
import HojaInferior from "@/components/ui/HojaInferior";
import Segmentos from "@/components/ui/Segmentos";
import { estadoComida } from "@/lib/dia";
import type { ClaveGrupo, ClaveTiempo } from "@/lib/dominio";
import { parsear } from "@/lib/numeros";
import {
  porcionesIguales,
  porcionesVacias,
  textoPorciones,
} from "@/lib/porciones";
import type { Alimento, Comida, Menu, Porciones } from "@/lib/supabase/tipos";
import { MAXIMO_TEXTO } from "@/lib/validarComida";

type Modo = "menu" | "porciones" | "fuera";

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  tiempo: ClaveTiempo;
  etiqueta: string;
  hora?: string;
  comida?: Comida;
  metas: Porciones;
  menus: Menu[];
  alimentos: Alimento[];
  onElegirMenu: (menu: Menu) => void;
  onGuardarPorciones: (porciones: Porciones, kcal: number | null) => void;
  onGuardarFuera: (
    texto: string,
    porciones: Porciones,
    kcal: number | null,
  ) => void;
  onBorrar: () => void;
};

export default function HojaComida(props: Props) {
  const { abierta, tiempo, hora, comida } = props;

  if (!abierta) return null;

  const estado = estadoComida(comida);

  /*
    El estado de la hoja se reinicia en cada apertura. La `key` fuerza a React
    a montar un Contenido nuevo, así no hay que sincronizar props con estado
    dentro de efectos.
  */
  return (
    <Contenido
      key={`${tiempo}-${comida?.id ?? "nueva"}-${comida?.updated_at ?? ""}`}
      {...props}
      subtitulo={hora ? `${hora} · ${estado}` : estado}
    />
  );
}

function Contenido({
  onCerrar,
  etiqueta,
  subtitulo,
  comida,
  metas,
  menus,
  alimentos,
  onElegirMenu,
  onGuardarPorciones,
  onGuardarFuera,
  onBorrar,
}: Props & { subtitulo: string }) {
  // El modo inicial sigue a lo que ya está registrado: reabrir una comida
  // muestra cómo se registró, no el primer paso de nuevo.
  const modoInicial: Modo =
    comida?.modo === "fuera"
      ? "fuera"
      : comida?.modo === "manual"
        ? "porciones"
        : "menu";

  const kcalInicial = comida?.kcal != null ? String(comida.kcal) : "";
  const textoInicial = comida?.texto_libre ?? "";

  const [modo, setModo] = useState<Modo>(modoInicial);

  // Marcar porciones y Comí fuera comparten las porciones en edición.
  const [porciones, setPorciones] = useState<Porciones>(
    () => ({ ...(comida?.porciones ?? {}) }),
  );
  const [kcal, setKcal] = useState(kcalInicial);
  const [texto, setTexto] = useState(textoInicial);
  const [equivalencias, setEquivalencias] = useState<Set<ClaveGrupo>>(new Set());
  const [porcionesFuera, setPorcionesFuera] = useState(
    () => comida?.modo === "fuera" && !porcionesVacias(comida.porciones),
  );
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);

  // Cambiar de modo o abrir equivalencias no cuenta: solo lo marcado o escrito.
  const hayCambios =
    !porcionesIguales(porciones, comida?.porciones) ||
    kcal !== kcalInicial ||
    texto !== textoInicial;

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Alimento[]>();
    for (const a of alimentos) {
      const lista = mapa.get(a.grupo) ?? [];
      lista.push(a);
      mapa.set(a.grupo, lista);
    }
    return mapa;
  }, [alimentos]);

  const kcalNumero = (() => {
    const n = parsear(kcal);
    return n != null && Number.isInteger(n) && n >= 0 ? n : null;
  })();

  function alternarEquivalencias(grupo: ClaveGrupo) {
    setEquivalencias((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(grupo)) siguiente.delete(grupo);
      else siguiente.add(grupo);
      return siguiente;
    });
  }

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={etiqueta}
      subtitulo={subtitulo}
      hayCambios={hayCambios}
    >
      <div className="flex flex-col gap-4">
        <Segmentos
          valor={modo}
          onChange={setModo}
          opciones={[
            { valor: "menu", etiqueta: "Elegir menú" },
            { valor: "porciones", etiqueta: "Marcar porciones" },
            { valor: "fuera", etiqueta: "Comí fuera" },
          ]}
        />

        {modo === "menu" ? (
          <div className="flex flex-col gap-2.5">
            {menus.length === 0 ? (
              <p className="py-2 text-[14px] leading-relaxed text-tinta-3">
                No hay menús para este tiempo. Puedes marcar porciones.
              </p>
            ) : (
              <>
                {menus.map((m) => {
                  const elegido = comida?.menu_id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onElegirMenu(m)}
                      className={`w-full rounded-tarjeta border bg-superficie p-4 text-left transition-transform active:scale-[0.99] ${
                        elegido ? "border-verde" : "border-linea"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-serif text-[18.5px] font-medium text-tinta">
                          {m.nombre}
                        </span>
                        {elegido ? (
                          <span className="shrink-0 text-[11.5px] uppercase tracking-[0.04em] text-verde">
                            Elegido
                          </span>
                        ) : null}
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
                        {textoPorciones(m.porciones, m.kcal)}
                      </p>
                    </button>
                  );
                })}
                <p className="px-2 py-2.5 text-center text-[13px] leading-relaxed text-tinta-4">
                  Al elegir un menú las porciones se suman solas.
                </p>
              </>
            )}
          </div>
        ) : null}

        {modo === "porciones" ? (
          <div className="flex flex-col gap-3">
            <SelectorPorciones
              valor={porciones}
              onChange={setPorciones}
              metas={metas}
              extra={(grupo) => {
                const abierta = equivalencias.has(grupo);
                const lista = porGrupo.get(grupo) ?? [];
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => alternarEquivalencias(grupo)}
                      className="pb-0.5 pt-2 text-[12.5px] text-verde"
                    >
                      {abierta ? "Ocultar equivalencias" : "Ver equivalencias"}
                    </button>
                    {abierta ? (
                      <div className="mt-1.5 rounded-[9px] bg-superficie-suave px-[11px] py-2.5 font-mono text-[11.5px] leading-[1.65] text-tinta-2">
                        {lista.map((a) => (
                          <div key={a.id}>
                            {a.nombre} — {a.medida_casera}
                            {a.gramos != null ? ` (${a.gramos} g)` : ""}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                );
              }}
            />

            <CampoNumerico
              etiqueta="kcal (opcional)"
              valor={kcal}
              onChange={setKcal}
              modo="entero"
            />

            <Boton
              onClick={() => onGuardarPorciones(porciones, kcalNumero)}
              disabled={porcionesVacias(porciones)}
            >
              {comida ? "Guardar cambios" : "Guardar comida"}
            </Boton>
          </div>
        ) : null}

        {modo === "fuera" ? (
          <div className="flex flex-col gap-3">
            <CampoTexto
              etiqueta="¿Qué comiste?"
              valor={texto}
              onChange={setTexto}
              placeholder="Almuerzo en el trabajo"
              maxLength={MAXIMO_TEXTO}
            />

            <p className="px-0.5 text-[13.5px] leading-relaxed text-tinta-3">
              Comer fuera está bien. El día queda registrado igual, marcado como
              estimado.
            </p>

            <button
              type="button"
              onClick={() => setPorcionesFuera((v) => !v)}
              className="p-0.5 text-left text-[13.5px] text-verde"
            >
              {porcionesFuera
                ? "Ocultar porciones estimadas"
                : "Marcar porciones estimadas (opcional)"}
            </button>

            {porcionesFuera ? (
              <SelectorPorciones valor={porciones} onChange={setPorciones} />
            ) : null}

            <CampoNumerico
              etiqueta="kcal estimadas (opcional)"
              valor={kcal}
              onChange={setKcal}
              modo="entero"
            />

            <Boton
              variante="estimada"
              onClick={() => onGuardarFuera(texto, porciones, kcalNumero)}
            >
              {/* Si ya estaba estimada es una edición; si no, cambia su estado. */}
              {comida?.modo === "fuera"
                ? "Guardar cambios"
                : "Cerrar comida como estimada"}
            </Boton>
          </div>
        ) : null}

        {comida ? (
          confirmandoBorrar ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <p className="text-[13.5px] leading-relaxed text-tinta-2">
                ¿Eliminar el registro de esta comida? Vuelve a quedar pendiente.
              </p>
              <Boton variante="secundaria" onClick={onBorrar}>
                Eliminar
              </Boton>
              <button
                type="button"
                onClick={() => setConfirmandoBorrar(false)}
                className="h-[46px] text-[13.5px] text-tinta-3"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoBorrar(true)}
              className="h-[46px] w-full text-[13.5px] text-tinta-4"
            >
              Borrar registro de esta comida
            </button>
          )
        ) : null}
      </div>
    </HojaInferior>
  );
}

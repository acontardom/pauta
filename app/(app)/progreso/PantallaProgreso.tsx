"use client";

import { useState } from "react";
import Boton from "@/components/ui/Boton";
import { HojaDescartar } from "@/components/ui/HojaInferior";
import { formatoCorto } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";
import {
  delta,
  progresoGrasa,
  serieGrafico,
  textoPctGrasa,
  ultimoYAnterior,
  type TonoDelta,
} from "@/lib/progreso";
import type { Configuracion, Inbody, Medida } from "@/lib/supabase/tipos";
import GraficoInbody from "./GraficoInbody";
import GraficoSerie from "./GraficoSerie";
import HojaLista from "./HojaLista";
import HojaMedida from "./HojaMedida";
import SeccionInbody from "./SeccionInbody";

type Props = {
  configuracion: Pick<
    Configuracion,
    "meta_peso" | "meta_cintura" | "meta_pct_grasa"
  >;
  /** Ordenadas por fecha, de la más antigua a la más reciente. */
  medidas: Medida[];
  /** Ordenadas por fecha y orden de llegada. */
  inbody: Inbody[];
  hoy: string;
};

/** null = nada abierto · "nuevo"/"lista" · un Medida = editar ese. */
type Hoja = null | "nuevo" | "lista" | Medida;

/** Formulario de InBody: cerrado, nuevo o editando esa medición. */
type FormInbody = null | "nuevo" | Inbody;

/* Bajar es bueno y va en verde; subir es neutro, nunca rojo. */
const TONO: Record<TonoDelta, string> = {
  bueno: "text-verde",
  neutro: "text-tinta-3",
};

function Tarjeta({
  titulo,
  derecha,
  children,
}: {
  titulo: string;
  derecha?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-tarjeta border border-linea bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="text-[13px] uppercase tracking-[0.06em] text-tinta-3">
          {titulo}
        </h2>
        {derecha}
      </div>
      {children}
    </div>
  );
}

export default function PantallaProgreso({
  configuracion,
  medidas,
  inbody,
  hoy,
}: Props) {
  const [hoja, setHoja] = useState<Hoja>(null);
  const [metaAbierta, setMetaAbierta] = useState(false);
  const [formInbody, setFormInbody] = useState<FormInbody>(null);
  const [inbodyConCambios, setInbodyConCambios] = useState(false);
  /** El formulario de InBody que espera confirmación para reemplazar al actual. */
  const [pendienteInbody, setPendienteInbody] = useState<{
    siguiente: FormInbody;
  } | null>(null);

  /*
    El formulario de InBody es en línea: lo cierran "Cancelar" y lo reemplazan
    "Editar" o "Agregar medición". Si tiene algo escrito, cualquiera de esos
    pide la misma confirmación que las hojas. Pedir el mismo formulario que ya
    está abierto no descarta nada.
  */
  function cambiarFormInbody(siguiente: FormInbody) {
    if (inbodyConCambios && claveInbody(siguiente) !== claveInbody(formInbody)) {
      setPendienteInbody({ siguiente });
    } else {
      setFormInbody(siguiente);
    }
  }

  const metaPeso = configuracion.meta_peso;
  const metaCintura = configuracion.meta_cintura;
  const metaGrasa = configuracion.meta_pct_grasa;

  // Peso y cintura se calculan por separado: un registro de solo peso no
  // cuenta como dato de cintura.
  const peso = ultimoYAnterior(medidas, "peso");
  const cintura = ultimoYAnterior(medidas, "cintura");

  const deltaPeso = delta(
    peso.actual ? { valor: peso.actual.peso!, fecha: peso.actual.fecha } : null,
    peso.anterior
      ? { valor: peso.anterior.peso!, fecha: peso.anterior.fecha }
      : null,
    "kg",
  );
  const deltaCintura = delta(
    cintura.actual
      ? { valor: cintura.actual.cintura!, fecha: cintura.actual.fecha }
      : null,
    cintura.anterior
      ? { valor: cintura.anterior.cintura!, fecha: cintura.anterior.fecha }
      : null,
    "cm",
  );

  const seriePeso = serieGrafico(medidas, "peso", metaPeso);
  const serieCintura = serieGrafico(medidas, "cintura", metaCintura);

  // % de grasa: el punto de partida es la primera medición que lo tenga.
  const conGrasa = inbody.filter((m) => m.pct_grasa != null);
  const grasaInicial = conGrasa[0] ?? null;
  const grasaActual = conGrasa[conGrasa.length - 1] ?? null;
  const avanceGrasa = progresoGrasa(
    grasaActual?.pct_grasa,
    grasaInicial?.pct_grasa,
    metaGrasa,
  );

  // La tendencia necesita al menos dos mediciones con alguno de los dos datos.
  const hayTendencia =
    Math.max(
      inbody.filter((m) => m.masa_grasa != null).length,
      inbody.filter((m) => m.masa_musculoesqueletica != null).length,
    ) >= 2;

  // De la más reciente a la más antigua, para la hoja de lista.
  const recientesPrimero = medidas.slice().reverse();

  return (
    <>
      <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
        <h1 className="font-serif text-[27px] font-medium text-tinta">
          Progreso
        </h1>

        {/*
          La meta en una línea: se lee de un vistazo y no le quita espacio a
          los números. El detalle queda a un toque, para no repetirlo cada vez.
        */}
        <div className="mt-3 rounded-xl border border-verde-borde bg-verde-fondo px-[15px] py-[13px]">
          <button
            type="button"
            aria-expanded={metaAbierta}
            onClick={() => setMetaAbierta((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[14.5px] leading-snug text-verde-oscuro">
              Meta: bajar grasa y preservar músculo.
            </span>
            <svg
              aria-hidden
              viewBox="0 0 12 8"
              className={`h-2 w-3 shrink-0 text-verde-oscuro transition-transform ${
                metaAbierta ? "rotate-180" : ""
              }`}
            >
              <path
                d="M1 1.5 6 6.5 11 1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {metaAbierta ? (
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-verde-oscuro">
              La masa musculoesquelética se mira igual que el peso: si baja, el
              plan no está funcionando, aunque la balanza sí baje. Por eso en
              InBody bajar es bueno en peso, masa grasa y % de grasa, y es aviso
              (ámbar) en masa musculoesquelética, masa libre de grasa y agua.
            </p>
          ) : null}
        </div>

        {/* % de grasa */}
        <Tarjeta titulo="% de grasa">
          {grasaActual ? (
            <>
              <div className="mt-1.5 flex items-baseline gap-3">
                <span className="font-serif text-[46px] leading-none tracking-[-0.02em] text-tinta">
                  {textoPctGrasa(grasaActual.pct_grasa)}%
                </span>
                {metaGrasa != null ? (
                  <span className="text-[14px] text-tinta-3">
                    meta {formatear(metaGrasa)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-[4px] bg-vacio">
                <div
                  className="h-full bg-verde"
                  style={{ width: `${avanceGrasa * 100}%` }}
                />
              </div>
              <div className="mt-[7px] flex justify-between font-mono text-[10.5px] text-tinta-4">
                <span>
                  {grasaInicial
                    ? `${textoPctGrasa(grasaInicial.pct_grasa)}% · ${formatoCorto(grasaInicial.fecha)}`
                    : ""}
                </span>
                <span>
                  {metaGrasa != null ? `meta ${formatear(metaGrasa)}%` : ""}
                </span>
              </div>
            </>
          ) : (
            // El botón para agregarla está en InBody, más abajo: no se repite acá.
            <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
              Con una medición InBody aparece tu % de grasa y su distancia a la
              meta.
            </p>
          )}
        </Tarjeta>

        {/*
          Grasa y músculo: la tarjeta existe solo cuando hay tendencia que
          mostrar. Vacía no aporta nada y estorba a los números de al lado.
        */}
        {hayTendencia ? (
          <Tarjeta titulo="Grasa y músculo">
            <GraficoInbody mediciones={inbody} />
          </Tarjeta>
        ) : null}

        {/* Peso */}
        <Tarjeta
          titulo="Peso"
          derecha={
            <span className="font-serif text-[20px] text-tinta">
              {peso.actual ? `${formatear(peso.actual.peso)} kg` : "—"}
            </span>
          }
        >
          {seriePeso.puntos.length > 0 ? (
            <>
              <p className={`mt-0.5 text-[12.5px] ${TONO[deltaPeso.tono]}`}>
                {deltaPeso.texto}
              </p>
              <GraficoSerie
                serie={seriePeso}
                color="verde"
                etiquetaMeta={
                  metaPeso != null ? `meta ${formatear(metaPeso)} kg` : undefined
                }
              />
            </>
          ) : (
            <>
              <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
                Todavía no hay registros de peso.
              </p>
              <Boton
                variante="secundaria"
                className="mt-3 h-12"
                onClick={() => setHoja("nuevo")}
              >
                Registrar peso
              </Boton>
            </>
          )}
        </Tarjeta>

        {/* Cintura */}
        <Tarjeta
          titulo="Cintura"
          derecha={
            <span className="font-serif text-[20px] text-tinta">
              {cintura.actual ? `${formatear(cintura.actual.cintura)} cm` : "—"}
            </span>
          }
        >
          {serieCintura.puntos.length > 0 ? (
            <>
              <p className={`mt-0.5 text-[12.5px] ${TONO[deltaCintura.tono]}`}>
                {deltaCintura.texto}
              </p>
              <GraficoSerie
                serie={serieCintura}
                color="arena"
                etiquetaMeta={
                  metaCintura != null
                    ? `meta ${formatear(metaCintura)} cm`
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
                Todavía no hay registros de cintura.
              </p>
              <Boton
                variante="secundaria"
                className="mt-3 h-12"
                onClick={() => setHoja("nuevo")}
              >
                Registrar cintura
              </Boton>
            </>
          )}
        </Tarjeta>

        {/*
          Registrar va DESPUÉS de los gráficos: primero se mira cómo va la
          cosa (% de grasa, peso, cintura) y recién después se anota.
        */}
        <Boton className="mt-3.5" onClick={() => setHoja("nuevo")}>
          Registrar peso y cintura
        </Boton>

        {medidas.length > 0 ? (
          <button
            type="button"
            onClick={() => setHoja("lista")}
            className="w-full pb-0.5 pt-2.5 text-[13.5px] text-verde"
          >
            Ver registros anteriores ({medidas.length})
          </button>
        ) : null}

        <SeccionInbody
          mediciones={inbody}
          hoy={hoy}
          form={formInbody}
          onAbrirNuevo={() => cambiarFormInbody("nuevo")}
          onEditar={(m) => cambiarFormInbody(m)}
          onCancelar={() => cambiarFormInbody(null)}
          onCerrar={() => setFormInbody(null)}
          onCambios={setInbodyConCambios}
        />
      </div>

      {hoja === "lista" ? (
        <HojaLista
          medidas={recientesPrimero}
          onCerrar={() => setHoja(null)}
          onEditar={(m) => setHoja(m)}
          onNuevo={() => setHoja("nuevo")}
        />
      ) : null}

      {hoja !== null && hoja !== "lista" ? (
        <HojaMedida
          // La key remonta el formulario en cada apertura, así no arrastra lo
          // escrito en el registro anterior.
          key={hoja === "nuevo" ? "nuevo" : `${hoja.id}-${hoja.updated_at}`}
          medida={hoja === "nuevo" ? null : hoja}
          hoy={hoy}
          onCerrar={() => setHoja(null)}
        />
      ) : null}

      <HojaDescartar
        abierta={pendienteInbody !== null}
        onSeguir={() => setPendienteInbody(null)}
        onDescartar={() => {
          if (pendienteInbody) setFormInbody(pendienteInbody.siguiente);
          setPendienteInbody(null);
        }}
      />
    </>
  );
}

/** Identifica qué formulario de InBody está abierto (la misma key que usa SeccionInbody). */
function claveInbody(form: FormInbody): string | null {
  if (form === null) return null;
  return form === "nuevo" ? "nuevo" : `${form.id}-${form.updated_at}`;
}

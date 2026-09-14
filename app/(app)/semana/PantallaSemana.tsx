import Link from "next/link";
import { GRUPOS, type TonoEntrenamiento } from "@/lib/dominio";
import type {
  DiaSemana,
  Observacion,
  Promedios,
  TonoCelda,
} from "@/lib/semana";
import {
  entrenamientoSemana,
  fraseSemana,
  textoPromedioAgua,
  textoPromedioKcal,
  textoSesiones,
} from "@/lib/semana";

type Props = {
  semana: DiaSemana[];
  promedios: Promedios;
  observaciones: Observacion[];
};

/*
  Ningún tono es de falla. "vacio" dice que no hay registro, no que algo
  esté mal; el azul es la comida estimada, que cuenta igual.
*/
const FONDO: Record<TonoCelda, string> = {
  vacio: "bg-vacio",
  verde: "bg-verde",
  "verde-medio": "bg-verde-medio",
  "verde-suave": "bg-verde-claro",
  azul: "bg-azul",
  "azul-suave": "bg-azul-claro",
};

/* Píldoras de la fila de entrenamiento. Tampoco hay tono de falla. */
const PILDORA: Record<TonoEntrenamiento, string> = {
  sesion: "bg-verde-fondo text-verde-oscuro",
  neutro: "bg-superficie-suave text-tinta-2",
  descanso: "bg-vacio text-tinta-4",
};

export default function PantallaSemana({
  semana,
  promedios,
  observaciones,
}: Props) {
  const registrados = semana.filter((d) => d.cerrado).length;
  const entrenamiento = entrenamientoSemana(semana);

  return (
    <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <div>
        <h1 className="text-[13px] uppercase tracking-[0.06em] text-tinta-3">
          Días registrados
        </h1>
        <div className="mt-1.5 flex items-baseline gap-3">
          <span className="font-serif text-[64px] leading-none tracking-[-0.02em] text-tinta">
            {registrados}
          </span>
          <span className="font-serif text-[26px] text-tinta-4">/7</span>
        </div>
      </div>
      <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
        {fraseSemana(registrados)}
      </p>

      {/* Grilla */}
      <div className="mt-[26px] rounded-tarjeta border border-linea bg-superficie px-2.5 py-3.5">
        {/*
          Las etiquetas se alinean exactamente sobre sus columnas:
          izquierda  = 4px de padding de la fila + 34px de etiqueta + 8px de gap
          derecha    = 4px de padding + 10px del "›" + 8px de gap
        */}
        <div className="flex gap-1.5 pl-[46px] pr-[22px]">
          {GRUPOS.map((g) => (
            <div
              key={g.clave}
              className="flex-1 text-center text-[9.5px] uppercase tracking-[0.04em] text-tinta-4"
            >
              {g.corta}
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-1">
          {semana.map((d) => (
            <Link
              key={d.fecha}
              href={`/hoy?fecha=${d.fecha}`}
              className="flex items-center gap-2 rounded-lg px-1 py-[3px] transition-transform active:scale-[0.995]"
            >
              <span
                className={`w-[34px] shrink-0 text-[11.5px] ${
                  d.cerrado
                    ? "font-semibold text-tinta-2"
                    : "font-normal text-tinta-5"
                }`}
              >
                {d.etiqueta}
              </span>
              <span className="flex flex-1 gap-1.5">
                {d.celdas.map((c) => (
                  <span
                    key={c.grupo}
                    className={`h-[22px] flex-1 rounded-[5px] ${FONDO[c.tono]}`}
                  />
                ))}
              </span>
              <span
                aria-hidden
                className="w-2.5 shrink-0 text-right text-[15px] leading-none text-tinta-6"
              >
                ›
              </span>
            </Link>
          ))}
        </div>

        {/*
          Una sola fila. Los verdes van de menor a mayor: son pasos de una
          escala, no categorías. El azul y el vacío quedan aparte porque no
          son parte de ella.

          flex-nowrap y whitespace-nowrap la obligan a no partirse, y el
          clamp achica el texto en pantallas angostas antes que pasar a dos
          filas: 11,5px a 430px de ancho, hasta 8,5px como piso, que es lo que
          hace falta para que entre incluso en una pantalla de 320px.
        */}
        <div className="mt-3.5 flex flex-nowrap items-center gap-[0.5em] text-[clamp(8.5px,2.674vw,11.5px)] text-tinta-3">
          <span className="whitespace-nowrap">Porción de la meta:</span>

          <span className="flex shrink-0 gap-[3px]">
            {["bg-verde-claro", "bg-verde-medio", "bg-verde"].map((fondo) => (
              <span
                key={fondo}
                className={`h-2.5 w-2.5 rounded-[3px] ${fondo}`}
              />
            ))}
          </span>

          {/*
            Divisor entre los dos formatos de la leyenda: a la izquierda una
            escala (texto y tres cuadrados), a la derecha dos estados sueltos.
            A 11,5px quedan unos 9px por lado (gap de 0,5em más margen de
            0,28em), 18px en total; en em, para achicarse con el texto.
          */}
          <span
            aria-hidden
            className="mx-[0.28em] h-[1em] w-px shrink-0 bg-linea"
          />

          {[
            { etiqueta: "Estimado", fondo: "bg-azul" },
            { etiqueta: "Sin registro", fondo: "bg-vacio" },
          ].map((l) => (
            <span
              key={l.etiqueta}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${l.fondo}`} />
              {l.etiqueta}
            </span>
          ))}
        </div>
      </div>

      {/* Entrenamiento */}
      <div className="mt-3 rounded-tarjeta border border-linea bg-superficie px-2.5 py-3.5">
        <h2 className="px-1 text-[13px] uppercase tracking-[0.06em] text-tinta-3">
          Entrenamiento
        </h2>

        {/*
          Siete columnas con los mismos márgenes y gap que las de la grilla,
          así cada día queda justo bajo una columna. Los días van en el orden
          de las filas de la grilla, de izquierda a derecha, con su etiqueta
          arriba. min-w-0 y overflow-hidden: una píldora nunca ensancha la
          pantalla, aunque la columna sea angosta.
        */}
        <div className="mt-2.5 flex gap-1.5 pl-[46px] pr-[22px]">
          {entrenamiento.columnas.map((c) => (
            <div
              key={c.fecha}
              className="flex min-w-0 flex-1 flex-col gap-[3px] text-center"
            >
              <span className="overflow-hidden whitespace-nowrap text-[9.5px] uppercase tracking-[0.04em] text-tinta-4">
                {c.etiqueta}
              </span>
              {c.etiquetas.length === 0 ? (
                <span className="py-1 text-[11.5px] leading-none text-tinta-5">
                  —
                </span>
              ) : (
                c.etiquetas.map((e) => (
                  <span
                    key={e.texto}
                    className={`overflow-hidden whitespace-nowrap rounded-full py-1 text-[11.5px] leading-none ${PILDORA[e.tono]}`}
                  >
                    {e.corta}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 px-1 text-[13px] text-tinta-3">
          {textoSesiones(entrenamiento.sesiones)}
        </p>
      </div>

      {/* Promedios */}
      <div className="mt-3 flex gap-2.5">
        <div className="flex-1 rounded-tarjeta border border-linea bg-superficie p-3.5">
          <h2 className="text-[11px] uppercase tracking-[0.05em] text-tinta-3">
            Agua / día
          </h2>
          <p className="mt-1.5 font-serif text-[24px] text-tinta">
            {textoPromedioAgua(promedios.agua)}
          </p>
        </div>
        <div className="flex-1 rounded-tarjeta border border-linea bg-superficie p-3.5">
          <h2 className="text-[11px] uppercase tracking-[0.05em] text-tinta-3">
            Kcal activas
          </h2>
          <p className="mt-1.5 font-serif text-[24px] text-tinta">
            {textoPromedioKcal(promedios.kcal)}
          </p>
        </div>
      </div>

      {/* Observaciones: describen y proponen, nunca reprochan. */}
      <h2 className="mb-2.5 mt-[26px] text-[13px] uppercase tracking-[0.06em] text-tinta-3">
        Observaciones
      </h2>
      {observaciones.length === 0 ? (
        <p className="text-[14.5px] leading-relaxed text-tinta-2">
          Sin observaciones esta semana.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {observaciones.map((o) => (
            <div
              key={o.texto}
              className="rounded-xl border border-l-[3px] border-linea border-l-ambar bg-superficie px-[15px] py-3.5"
            >
              <p className="text-[15px] leading-relaxed text-tinta-fila">
                {o.texto}
              </p>
              <p className="mt-1.5 text-[12.5px] text-tinta-3">{o.sugerencia}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

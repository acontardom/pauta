import { formatoCorto, formatoDiaMes, formatoLargo } from "@/lib/fechas";
import {
  avance,
  diasTobillo,
  franjaTobillo,
  notaTobillo,
  posicionEnPeriodo,
  proximoControl,
  resumenKine,
} from "@/lib/recuperacion";
import type {
  Dia,
  EntradaRecuperacion,
  EstadoTobillo,
  Hito,
  PreguntaControl,
} from "@/lib/supabase/tipos";
import ListaPreguntas from "./ListaPreguntas";

type Props = {
  hoy: string;
  fechaOperacion: string;
  fechaRetorno: string;
  entradas: EntradaRecuperacion[];
  dias: Pick<Dia, "fecha" | "estado_tobillo" | "entrenamiento">[];
  preguntas: PreguntaControl[];
  hitos: Pick<Hito, "fecha_planificada" | "cumplido">[];
};

/*
  "Peor" va en ámbar, el color de atención de la app, igual de presente que los
  otros dos estados: es un dato, no una alerta. Nunca en rojo.
*/
const COLOR_TOBILLO: Record<EstadoTobillo | "sin", string> = {
  mejor: "bg-verde",
  igual: "bg-verde-apagado",
  peor: "bg-ambar",
  sin: "bg-vacio",
};

const LEYENDA_TOBILLO = [
  { etiqueta: "Mejor", clave: "mejor" },
  { etiqueta: "Igual", clave: "igual" },
  { etiqueta: "Peor", clave: "peor" },
  { etiqueta: "Sin registro", clave: "sin" },
] as const;

function Tarjeta({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-3 rounded-tarjeta border border-linea bg-superficie px-4 ${className}`}
    >
      {children}
    </div>
  );
}

function TituloTarjeta({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] uppercase tracking-[0.06em] text-tinta-3">
      {children}
    </h2>
  );
}

/** "Miércoles 23 de septiembre" → "miércoles 23 de septiembre", para ir a mitad de frase. */
function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export default function PantallaRecuperacion({
  hoy,
  fechaOperacion,
  fechaRetorno,
  entradas,
  dias,
  preguntas,
  hitos,
}: Props) {
  const a = avance(fechaOperacion, fechaRetorno, hoy);
  const kine = resumenKine(entradas, hoy);
  const tobillo = diasTobillo(dias, entradas, hoy);
  const franja = franjaTobillo(tobillo, hoy);
  const proximo = proximoControl(entradas);

  const marcas = hitos
    .filter((h): h is { fecha_planificada: string; cumplido: boolean } =>
      Boolean(h.fecha_planificada),
    )
    .map((h) => ({
      posicion: posicionEnPeriodo(fechaOperacion, fechaRetorno, h.fecha_planificada),
      cumplido: h.cumplido,
    }));

  return (
    <div className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <h1 className="font-serif text-[27px] font-medium text-tinta">
        Recuperación
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Operación el {formatoDiaMes(fechaOperacion)} · retorno el{" "}
        {formatoDiaMes(fechaRetorno)}
      </p>

      {/* Avance */}
      <Tarjeta className="mt-3.5 py-[18px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="font-serif text-[24px] text-tinta">
            Semana {a.semanaActual} de {a.semanasTotales}
          </span>
          <span className="shrink-0 text-[12.5px] text-tinta-3">
            {a.diasRestantes} {a.diasRestantes === 1 ? "día" : "días"} para el
            retorno
          </span>
        </div>

        <div
          className="relative mt-4 h-2.5 rounded-[5px] bg-vacio"
          role="img"
          aria-label={`Avance del período: semana ${a.semanaActual} de ${a.semanasTotales}`}
        >
          <div
            className="h-full rounded-[5px] bg-verde"
            style={{ width: `${a.razon * 100}%` }}
          />
          {/* Una marca por hito con fecha planificada, en su lugar del período. */}
          {marcas.map((m, i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute -top-[3px] h-4 w-0.5 -translate-x-1/2 rounded-[1px] ${
                m.cumplido ? "bg-verde-oscuro" : "bg-tinta-6"
              }`}
              style={{ left: `${m.posicion * 100}%` }}
            />
          ))}
        </div>

        <div className="mt-2 flex justify-between font-mono text-[10.5px] text-tinta-4">
          <span>{formatoCorto(fechaOperacion)}</span>
          <span>{formatoCorto(fechaRetorno)}</span>
        </div>

        <div className="mt-3.5 border-t border-linea-suave pt-3.5">
          {proximo ? (
            <p className="rounded-control bg-verde-fondo px-3 py-2.5 text-[13.5px] text-verde-oscuro">
              Próximo control: {minuscula(formatoLargo(proximo))}
            </p>
          ) : (
            <p className="text-[13.5px] text-tinta-3">
              Sin próximo control agendado.
            </p>
          )}
        </div>
      </Tarjeta>

      {/* Kinesiología */}
      <Tarjeta className="py-[18px]">
        <TituloTarjeta>Kinesiología</TituloTarjeta>
        <div className="mt-1.5 flex items-baseline gap-3">
          <span className="font-serif text-[46px] leading-none tracking-[-0.02em] text-tinta">
            {kine.total}
          </span>
          <span className="text-[14px] text-tinta-3">
            {kine.total === 1 ? "sesión" : "sesiones"}
            {kine.estaSemana > 0 ? ` · ${kine.estaSemana} esta semana` : ""}
          </span>
        </div>

        {kine.autorizaciones.length > 0 ? (
          <div className="mt-4 border-t border-linea-suave pt-3.5">
            <p className="mb-2.5 text-[12px] text-tinta-3">
              Autorizado hasta ahora
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {kine.autorizaciones.map((au) => (
                <span
                  key={au.etiqueta}
                  className="flex items-baseline gap-1.5 rounded-[20px] border border-verde-borde bg-verde-fondo px-3 py-[7px]"
                >
                  <span className="text-[13.5px] text-verde-oscuro">
                    {au.etiqueta}
                  </span>
                  <span className="text-[11.5px] text-verde-texto-suave">
                    sesión {au.numeroSesion}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3.5 text-[14.5px] leading-relaxed text-tinta-2">
              Registra una sesión de kinesiología para ir armando la lista de lo
              autorizado.
            </p>
            {/* La tarea 9b agrega acá el botón "Agregar sesión". */}
          </>
        )}
      </Tarjeta>

      {/* Tobillo */}
      <Tarjeta className="py-4">
        <TituloTarjeta>Tobillo, últimos 30 días</TituloTarjeta>

        {/* min-w-0 en cada celda: las 30 entran en cualquier ancho, sin scroll. */}
        <div
          className="mt-3 flex gap-[3px]"
          role="img"
          aria-label="Estado del tobillo en los últimos 30 días"
        >
          {franja.map((c) => (
            <span
              key={c.fecha}
              className={`h-[30px] min-w-0 flex-1 rounded-[4px] ${COLOR_TOBILLO[c.estado ?? "sin"]}`}
            />
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-3.5">
          {LEYENDA_TOBILLO.map((l) => (
            <span
              key={l.clave}
              className="flex items-center gap-1.5 text-[11.5px] text-tinta-3"
            >
              <span className={`h-2.5 w-2.5 rounded-[3px] ${COLOR_TOBILLO[l.clave]}`} />
              {l.etiqueta}
            </span>
          ))}
        </div>

        <p className="mt-3.5 border-t border-linea-suave pt-[13px] text-[14.5px] leading-relaxed text-tinta-fila">
          {notaTobillo(tobillo)}
        </p>
      </Tarjeta>

      <ListaPreguntas preguntas={preguntas} proximoControl={proximo} />
    </div>
  );
}

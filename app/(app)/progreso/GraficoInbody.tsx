import { formatear } from "@/lib/numeros";
import { ALTO, ANCHO, Y_ETIQUETAS, serieMultiple } from "@/lib/progreso";
import type { Inbody } from "@/lib/supabase/tipos";

type Props = {
  /** Ordenadas por fecha. */
  mediciones: Inbody[];
};

/*
  Masa grasa y masa musculoesquelética en la misma escala, compartiendo eje.

  Los colores del SVG vienen de las variables CSS de los tokens, porque
  `stroke` y `fill` no aceptan clases de Tailwind.
*/
const SERIES = [
  {
    id: "masa_grasa",
    etiqueta: "Masa grasa",
    trazo: "var(--color-terracota)",
    muestra: "bg-terracota",
  },
  {
    id: "masa_musculoesqueletica",
    etiqueta: "Masa musculoesquelética",
    trazo: "var(--color-verde)",
    muestra: "bg-verde",
  },
] as const;

export default function GraficoInbody({ mediciones }: Props) {
  const grafico = serieMultiple(
    SERIES.map((s) => ({
      id: s.id,
      datos: mediciones.map((m) => ({ fecha: m.fecha, valor: m[s.id] })),
    })),
  );

  return (
    <>
      <div className="mt-[9px] flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <span
            key={s.id}
            className="flex items-center gap-[7px] text-[12.5px] text-tinta-2"
          >
            <span className={`h-2.5 w-2.5 rounded-[3px] ${s.muestra}`} />
            {s.etiqueta}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        width="100%"
        height={140}
        // overflow visible: los valores sobre los puntos de los extremos no se cortan.
        className="mt-2 block overflow-visible"
        role="img"
        aria-label="Tendencia de masa grasa y masa musculoesquelética"
      >
        {grafico.series.map((serie, i) =>
          serie.path ? (
            <path
              key={serie.id}
              d={serie.path}
              fill="none"
              stroke={SERIES[i].trazo}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null,
        )}

        {grafico.series.flatMap((serie, i) =>
          serie.puntos.map((p, k) => (
            <circle
              key={`${serie.id}-${k}`}
              cx={p.x}
              cy={p.y}
              r={3.2}
              fill="var(--color-fondo)"
              stroke={SERIES[i].trazo}
              strokeWidth={2}
            />
          )),
        )}

        {/* El valor sobre el primer y el último punto de cada serie. */}
        {grafico.series.flatMap((serie, i) => {
          const puntos = serie.puntos;
          if (puntos.length === 0) return [];
          const ultimo = puntos[puntos.length - 1];
          const textos = [
            {
              clave: `${serie.id}-ultimo`,
              p: ultimo,
              anclaje: puntos.length > 1 ? "end" : "middle",
            },
          ];
          if (puntos.length > 1) {
            textos.push({ clave: `${serie.id}-primero`, p: puntos[0], anclaje: "start" });
          }
          return textos.map((t) => (
            <text
              key={t.clave}
              x={t.p.x}
              y={t.p.y - 9}
              fontSize={9.5}
              fill={SERIES[i].trazo}
              textAnchor={t.anclaje as "start" | "middle" | "end"}
            >
              {formatear(t.p.valor)}
            </text>
          ));
        })}

        {grafico.etiquetas.map((e) => (
          <text
            key={e.texto + e.x}
            x={e.x}
            y={Y_ETIQUETAS}
            fontSize={9}
            fill="var(--color-tinta-5)"
            textAnchor={e.anclaje}
          >
            {e.texto}
          </text>
        ))}
      </svg>
    </>
  );
}

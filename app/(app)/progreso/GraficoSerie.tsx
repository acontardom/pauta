import { ALTO, ANCHO, Y_ETIQUETAS, type Serie } from "@/lib/progreso";
import { formatear } from "@/lib/numeros";

type Props = {
  serie: Serie;
  /** Color de la línea y del borde de los puntos. */
  color: "verde" | "arena";
  /** Texto de la línea de meta, por ejemplo "meta 76,5 kg". */
  etiquetaMeta?: string;
};

/*
  Gráfico de una serie, dibujado a mano.

  Los colores del SVG no pueden ser clases de Tailwind en `stroke`, así que se
  toman de las variables CSS de los tokens: siguen siendo tokens, no hex
  sueltos.
*/
const TRAZO = {
  verde: "var(--color-verde)",
  arena: "var(--color-arena)",
} as const;

export default function GraficoSerie({ serie, color, etiquetaMeta }: Props) {
  if (serie.puntos.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      width="100%"
      height={ALTO}
      // overflow visible para que las etiquetas de los extremos no se corten.
      className="mt-2.5 block overflow-visible"
      role="img"
      aria-label={
        serie.puntos.length === 1
          ? `Un registro: ${formatear(serie.puntos[0].valor)}`
          : `${serie.puntos.length} registros, del ${formatear(serie.puntos[0].valor)} al ${formatear(serie.puntos[serie.puntos.length - 1].valor)}`
      }
    >
      {serie.metaY !== null ? (
        <>
          <line
            x1={6}
            x2={ANCHO - 6}
            y1={serie.metaY}
            y2={serie.metaY}
            stroke="var(--color-arena)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.65}
          />
          {etiquetaMeta ? (
            <text
              x={ANCHO - 6}
              y={serie.metaY - 5}
              fontSize={9}
              fill="var(--color-tinta-3)"
              textAnchor="end"
            >
              {etiquetaMeta}
            </text>
          ) : null}
        </>
      ) : null}

      {/* Con un solo punto no hay línea: `path` viene vacío. */}
      {serie.path ? (
        <path
          d={serie.path}
          fill="none"
          stroke={TRAZO[color]}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {serie.puntos.map((p) => (
        <circle
          key={p.fecha + p.valor}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="var(--color-fondo)"
          stroke={TRAZO[color]}
          strokeWidth={2}
        />
      ))}

      {serie.etiquetas.map((e) => (
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
  );
}

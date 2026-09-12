import {
  CAMPOS_INBODY,
  type ClaveInbody,
  type DireccionInbody,
} from "@/lib/dominio";
import { formatoBarra, formatoCorto, formatoDiaMes } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";

/*
  Series y deltas de Progreso.

  Todo puro y sin JSX: acá se calcula la geometría de los gráficos y los textos
  de variación, y la pantalla solo dibuja el SVG.

  Los gráficos se construyen a mano, sin librería: son series de pocos puntos
  y una línea de meta, y una librería de gráficos pesaría más que la pantalla.
*/

/* Geometría del SVG, igual que en el diseño.
   El viewBox es 0 0 320 120: el área de datos llega hasta y=100 y las
   etiquetas de fecha van en y=118. */
export const ANCHO = 320;
export const ALTO = 120;
const IZQ = 6;
const DER = 6;
const ARRIBA = 14;
const ABAJO = 100;
export const Y_ETIQUETAS = 118;

/** Margen vertical sobre el rango de los datos, para que nada toque el borde. */
const MARGEN = 0.1;

export type Registro = { fecha: string } & Record<string, unknown>;

export type Par<T> = { actual: T | null; anterior: T | null };

/**
 * Los dos registros más recientes que tengan ese campo con valor.
 * Los que lo tienen en null se ignoran: un registro de solo peso no cuenta
 * como dato de cintura.
 */
export function ultimoYAnterior<T extends Registro>(
  registros: T[],
  campo: keyof T,
): Par<T> {
  const conValor = registros
    .filter((r) => typeof r[campo] === "number" && Number.isFinite(r[campo]))
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    actual: conValor[conValor.length - 1] ?? null,
    anterior: conValor[conValor.length - 2] ?? null,
  };
}

export type Medicion = { valor: number; fecha: string };

/*
  Tono del delta. Nunca hay rojo: en peso, cintura y % de grasa bajar es bueno
  y va en verde; subir es "neutro", porque una semana al alza es información,
  no una falta.
*/
export type TonoDelta = "bueno" | "neutro";

export type Delta = { texto: string; tono: TonoDelta };

export function delta(
  actual: Medicion | null,
  anterior: Medicion | null,
  unidad: string,
): Delta {
  if (!actual || !anterior) {
    return { texto: "Primer registro", tono: "neutro" };
  }

  const diferencia = actual.valor - anterior.valor;
  // El signo menos es U+2212, no un guion: se alinea con los dígitos.
  const signo = diferencia < 0 ? "−" : "+";
  const magnitud = formatear(Math.abs(diferencia));

  return {
    texto: `${signo}${magnitud} ${unidad} desde el ${formatoDiaMes(anterior.fecha)}`,
    tono: diferencia < 0 ? "bueno" : "neutro",
  };
}

export type Punto = { x: number; y: number; valor: number; fecha: string };
export type EtiquetaEje = {
  x: number;
  texto: string;
  anclaje: "start" | "middle" | "end";
};

/**
 * Etiquetas del eje x: primera, última y la del medio cuando hay 3 o más.
 * Una sola va centrada.
 */
function etiquetasEje(fechas: string[], xs: number[]): EtiquetaEje[] {
  const n = fechas.length;
  if (n === 0) return [];
  const indices =
    n === 1 ? [0] : n < 3 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];

  return indices.map((i, k) => ({
    x: xs[i],
    texto: formatoCorto(fechas[i]),
    anclaje:
      indices.length === 1
        ? "middle"
        : k === 0
          ? "start"
          : k === indices.length - 1
            ? "end"
            : "middle",
  }));
}

export type Serie = {
  puntos: Punto[];
  /** Path del SVG. Vacío con 0 o 1 punto: no hay línea que dibujar. */
  path: string;
  etiquetas: EtiquetaEje[];
  /** Altura de la línea de meta, o null si no hay meta. */
  metaY: number | null;
};

const SERIE_VACIA: Serie = { puntos: [], path: "", etiquetas: [], metaY: null };

export function serieGrafico<T extends Registro>(
  registros: T[],
  campo: keyof T,
  meta: number | null | undefined,
): Serie {
  const datos = registros
    .filter((r) => typeof r[campo] === "number" && Number.isFinite(r[campo]))
    .map((r) => ({ fecha: r.fecha, valor: r[campo] as number }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (datos.length === 0) return SERIE_VACIA;

  const conMeta = typeof meta === "number" && Number.isFinite(meta);

  /*
    Escala vertical.

    Con un solo punto se centra verticalmente, así que el rango se construye
    SIMÉTRICO alrededor de ese valor: el punto queda al medio y la meta cae
    igual en su posición real, arriba o abajo según corresponda.

    Con dos o más puntos, el rango va del mínimo al máximo de la serie y de la
    meta, más un 10% de margen a cada lado.
  */
  let minimo: number;
  let maximo: number;

  if (datos.length === 1) {
    const centro = datos[0].valor;
    const distancia = conMeta ? Math.abs(centro - meta) : 0;
    // Sin meta, o con la meta justo en el valor, hace falta un rango mínimo
    // para no dividir por cero.
    const semiRango = distancia > 0 ? distancia * (1 + MARGEN) : 1;
    minimo = centro - semiRango;
    maximo = centro + semiRango;
  } else {
    const valores = datos.map((d) => d.valor);
    if (conMeta) valores.push(meta);
    minimo = Math.min(...valores);
    maximo = Math.max(...valores);
    // Serie plana: sin esto el rango sería 0 y todo caería en la misma y.
    if (maximo - minimo < 0.001) {
      minimo -= 0.5;
      maximo += 0.5;
    }
    const margen = (maximo - minimo) * MARGEN;
    minimo -= margen;
    maximo += margen;
  }

  const n = datos.length;
  const ancho = ANCHO - IZQ - DER;
  // Un punto solo va al centro horizontal, no pegado al borde izquierdo.
  const ejeX = (i: number) => (n === 1 ? IZQ + ancho / 2 : IZQ + (i * ancho) / (n - 1));
  const ejeY = (v: number) =>
    ARRIBA + (ABAJO - ARRIBA) * (1 - (v - minimo) / (maximo - minimo));

  const puntos: Punto[] = datos.map((d, i) => ({
    x: Number(ejeX(i).toFixed(1)),
    y: Number(ejeY(d.valor).toFixed(1)),
    valor: d.valor,
    fecha: d.fecha,
  }));

  const path =
    n < 2
      ? ""
      : puntos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  const etiquetas = etiquetasEje(
    datos.map((d) => d.fecha),
    puntos.map((p) => p.x),
  );

  return {
    puntos,
    path,
    etiquetas,
    metaY: conMeta ? Number(ejeY(meta).toFixed(1)) : null,
  };
}

/**
 * Avance entre 0 y 1 desde el % de grasa inicial hasta la meta.
 * 0 en el punto de partida, 1 al alcanzarla. No pasa de 1 ni baja de 0.
 */
export function progresoGrasa(
  pctActual: number | null | undefined,
  pctInicial: number | null | undefined,
  meta: number | null | undefined,
): number {
  if (pctActual == null || pctInicial == null || meta == null) return 0;

  const recorrido = pctInicial - meta;
  // Si la meta ya era el punto de partida, o está por encima, no hay escala:
  // solo importa si se alcanzó.
  if (recorrido <= 0) return pctActual <= meta ? 1 : 0;

  const avance = (pctInicial - pctActual) / recorrido;
  return Math.min(1, Math.max(0, avance));
}

/*
  El % de grasa se muestra con UN decimal fijo: "20,0", "13,2".

  No usa lib/numeros.formatear porque ese quita el ",0" de los enteros por
  contrato, y acá el decimal comunica la precisión de la medición: "20%" se
  lee como redondeado, "20,0%" como medido. La META en cambio sí va con
  formatear, porque es un objetivo redondo ("meta 13%").
*/
export function textoPctGrasa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(1).replace(".", ",");
}

/* ------------------------------------------------------------------------- */
/* InBody                                                                    */
/* ------------------------------------------------------------------------- */

/*
  Tono de un delta de InBody. A diferencia de peso y cintura, acá SÍ existe
  "malo": perder masa musculoesquelética es justo lo que la meta quiere evitar.
  Va en ámbar, el color de atención de la app. Nunca en rojo.
*/
export type TonoInbody = "bueno" | "malo" | "neutro";

export type DeltaInbody = { texto: string; tono: TonoInbody };

export function deltaInbody(
  valor: number | null | undefined,
  valorAnterior: number | null | undefined,
  direccion: DireccionInbody,
): DeltaInbody {
  if (valor == null || valorAnterior == null) {
    return { texto: "", tono: "neutro" };
  }

  // Se redondea a un decimal ANTES de decidir el signo: 15,8 − 16,7 da
  // −0,9000000000000004, y un residuo de punto flotante convertiría un
  // "sin cambio" en "−0".
  const diferencia = Math.round((valor - valorAnterior) * 10) / 10;
  if (diferencia === 0) return { texto: "±0", tono: "neutro" };

  const mejora = direccion === "baja" ? diferencia < 0 : diferencia > 0;
  return {
    // U+2212, el signo menos real.
    texto: `${diferencia > 0 ? "+" : "−"}${formatear(Math.abs(diferencia))}`,
    tono: mejora ? "bueno" : "malo",
  };
}

export type DatoSerie = { fecha: string; valor: number | null };
export type SerieEntrada = { id: string; datos: DatoSerie[] };
export type SerieSalida = { id: string; path: string; puntos: Punto[] };
export type GraficoMultiple = {
  series: SerieSalida[];
  etiquetas: EtiquetaEje[];
};
export type CajaGrafico = { ancho: number; alto: number };

/*
  Varias series en la MISMA escala vertical, compartiendo el eje x.

  El eje x se arma por FECHA, no por posición: si una medición tiene masa grasa
  pero no masa musculoesquelética, los puntos siguientes de esa serie no se
  corren a la izquierda y las dos series siguen alineadas en el tiempo.
*/
export function serieMultiple(
  series: SerieEntrada[],
  viewBox: CajaGrafico = { ancho: ANCHO, alto: ALTO },
): GraficoMultiple {
  const limpias = series.map((s) => ({
    id: s.id,
    datos: s.datos
      .filter(
        (d): d is { fecha: string; valor: number } =>
          typeof d.valor === "number" && Number.isFinite(d.valor),
      )
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
  }));

  const valores = limpias.flatMap((s) => s.datos.map((d) => d.valor));
  if (valores.length === 0) {
    return {
      series: limpias.map((s) => ({ id: s.id, path: "", puntos: [] })),
      etiquetas: [],
    };
  }

  const fechas = [
    ...new Set(limpias.flatMap((s) => s.datos.map((d) => d.fecha))),
  ].sort();
  const n = fechas.length;

  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);
  if (maximo - minimo < 0.001) {
    minimo -= 0.5;
    maximo += 0.5;
  }
  const margen = (maximo - minimo) * MARGEN;
  minimo -= margen;
  maximo += margen;

  // Con el viewBox de 320×120, el área de datos va de y=14 a y=100.
  const abajo = viewBox.alto - (ALTO - ABAJO);
  const ancho = viewBox.ancho - IZQ - DER;
  const xDeFecha = (fecha: string) => {
    const i = fechas.indexOf(fecha);
    return n === 1 ? IZQ + ancho / 2 : IZQ + (i * ancho) / (n - 1);
  };
  const ejeY = (v: number) =>
    ARRIBA + (abajo - ARRIBA) * (1 - (v - minimo) / (maximo - minimo));

  return {
    series: limpias.map((s) => {
      const puntos: Punto[] = s.datos.map((d) => ({
        x: Number(xDeFecha(d.fecha).toFixed(1)),
        y: Number(ejeY(d.valor).toFixed(1)),
        valor: d.valor,
        fecha: d.fecha,
      }));
      return {
        id: s.id,
        path:
          puntos.length < 2
            ? ""
            : puntos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" "),
        puntos,
      };
    }),
    etiquetas: etiquetasEje(
      fechas,
      fechas.map((f) => Number(xDeFecha(f).toFixed(1))),
    ),
  };
}

/** Una medición InBody: la fecha más cualquiera de los seis campos. */
export type MedicionInbody = { fecha: string } & Partial<
  Record<ClaveInbody, number | null>
>;

export type FilaInbody = {
  clave: ClaveInbody;
  etiqueta: string;
  /** "83,4 kg", "20,0%" o "—". */
  valor: string;
  delta: DeltaInbody;
  destacada: boolean;
};

export type TarjetaInbody<T extends MedicionInbody> = {
  medicion: T;
  /** "1 de septiembre" */
  titulo: string;
  /** "vs. 1/9" o "primera medición" */
  referencia: string;
  filas: FilaInbody[];
};

function textoValorInbody(
  clave: ClaveInbody,
  unidad: string,
  valor: number | null | undefined,
): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  // El % de grasa con un decimal fijo, igual que en su tarjeta de arriba.
  if (clave === "pct_grasa") return `${textoPctGrasa(valor)}%`;
  return `${formatear(valor)} ${unidad}`;
}

/*
  Una tarjeta por medición, de la más reciente a la más antigua. Cada una se
  compara con la medición inmediatamente anterior, campo por campo. Un campo
  en null muestra "—" y no genera delta, ni en su tarjeta ni en la siguiente.
*/
export function tarjetasInbody<T extends MedicionInbody>(
  mediciones: T[],
): TarjetaInbody<T>[] {
  // Orden estable: con dos mediciones el mismo día se respeta el orden de
  // llegada, que la consulta ya da por fecha de creación.
  const ascendentes = mediciones
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.fecha.localeCompare(b.m.fecha) || a.i - b.i)
    .map((x) => x.m);

  return ascendentes
    .map((medicion, i) => {
      const anterior = i > 0 ? ascendentes[i - 1] : null;
      return {
        medicion,
        titulo: formatoDiaMes(medicion.fecha),
        referencia: anterior
          ? `vs. ${formatoBarra(anterior.fecha)}`
          : "primera medición",
        filas: CAMPOS_INBODY.map((campo) => ({
          clave: campo.clave,
          etiqueta: campo.etiqueta,
          valor: textoValorInbody(campo.clave, campo.unidad, medicion[campo.clave]),
          delta: deltaInbody(
            medicion[campo.clave],
            anterior ? anterior[campo.clave] : null,
            campo.direccion,
          ),
          destacada: campo.destacada,
        })),
      };
    })
    .reverse();
}


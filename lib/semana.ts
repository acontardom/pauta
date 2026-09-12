import { estadoComida, totalesDia, type TotalesDia } from "@/lib/dia";
import { GRUPOS, TIEMPOS, type ClaveGrupo } from "@/lib/dominio";
import { diaDelMes, inicialDia } from "@/lib/fechas";
import { formatear } from "@/lib/numeros";
import type { Comida, Dia, Porciones } from "@/lib/supabase/tipos";

/*
  Agregación de los últimos 7 días.

  Todo acá es puro: recibe las filas ya leídas de la base y devuelve datos,
  nunca JSX. La pantalla solo traduce tonos a clases.

  La semana son 7 días MÓVILES que terminan hoy, no de lunes a domingo: lo que
  importa es qué tan cubierto está el registro reciente.
*/

/** Los campos de dias que necesita la semana. */
export type DiaSemanaFila = Pick<
  Dia,
  | "fecha"
  | "agua_ml"
  | "kcal_activas"
  | "entrenamiento"
  | "estado_tobillo"
  | "cerrado"
>;

export type ConfigSemana = {
  metas_porciones: Porciones;
  meta_agua_ml: number | null;
};

/*
  Tonos posibles de una celda. Ninguno es de falla: el más bajo es "vacio",
  que dice que no hay registro, no que algo esté mal.
*/
export type TonoCelda =
  | "vacio"
  | "verde"
  | "verde-medio"
  | "verde-suave"
  | "azul"
  | "azul-suave";

export type Celda = {
  grupo: ClaveGrupo;
  /** Total sobre meta, con tope en 1. */
  razon: number;
  tono: TonoCelda;
};

export type DiaSemana = {
  fecha: string;
  /** "V 11" */
  etiqueta: string;
  cerrado: boolean;
  /** Alguna comida del día quedó como estimada (comí fuera). */
  estimado: boolean;
  totales: TotalesDia;
  celdas: Celda[];
  /*
    Las comidas y la fila de dias viajan con cada día porque observaciones()
    las necesita (qué tiempos se saltaron, entrenamiento, tobillo, agua) y
    recibe solo la semana ya construida.
  */
  comidas: Comida[];
  dia: DiaSemanaFila | null;
};

function tonoDe(razon: number, estimado: boolean): TonoCelda {
  if (razon <= 0) return "vacio";
  if (estimado) return razon >= 1 ? "azul" : "azul-suave";
  if (razon >= 1) return "verde";
  return razon >= 0.6 ? "verde-medio" : "verde-suave";
}

export function construirSemana(
  fechas: string[],
  dias: DiaSemanaFila[],
  comidas: Comida[],
  config: ConfigSemana,
): DiaSemana[] {
  const diaPorFecha = new Map(dias.map((d) => [d.fecha, d]));

  const comidasPorFecha = new Map<string, Comida[]>();
  for (const c of comidas) {
    const lista = comidasPorFecha.get(c.fecha) ?? [];
    lista.push(c);
    comidasPorFecha.set(c.fecha, lista);
  }

  return fechas.map((fecha) => {
    const dia = diaPorFecha.get(fecha) ?? null;
    const delDia = comidasPorFecha.get(fecha) ?? [];
    const totales = totalesDia(delDia);

    // Un día estimado sigue sumando sus porciones: solo cambia el color.
    const estimado = delDia.some((c) => estadoComida(c) === "estimada");

    const celdas: Celda[] = GRUPOS.map((g) => {
      const meta = config.metas_porciones?.[g.clave];
      const valor = totales.porciones[g.clave] ?? 0;
      const razon = meta && meta > 0 ? Math.min(1, valor / meta) : 0;
      return { grupo: g.clave, razon, tono: tonoDe(razon, estimado) };
    });

    return {
      fecha,
      etiqueta: `${inicialDia(fecha)} ${diaDelMes(fecha)}`,
      cerrado: dia?.cerrado ?? false,
      estimado,
      totales,
      celdas,
      comidas: delDia,
      dia,
    };
  });
}

export type Promedios = {
  /** Promedio de agua en ml, o null si ningún día tiene el dato. */
  agua: number | null;
  kcal: number | null;
};

/*
  Promedios sobre los días QUE TIENEN el dato, no sobre 7.

  Si tomé agua tres días y los otros cuatro no anoté nada, el promedio de esos
  tres es la información útil; dividir por 7 inventaría un dato bajo que nunca
  se registró.
*/
export function promedios(dias: DiaSemanaFila[]): Promedios {
  let sumaAgua = 0;
  let nAgua = 0;
  let sumaKcal = 0;
  let nKcal = 0;

  for (const d of dias) {
    if (d.agua_ml != null && d.agua_ml > 0) {
      sumaAgua += d.agua_ml;
      nAgua++;
    }
    if (d.kcal_activas != null) {
      sumaKcal += d.kcal_activas;
      nKcal++;
    }
  }

  return {
    agua: nAgua > 0 ? sumaAgua / nAgua : null,
    kcal: nKcal > 0 ? sumaKcal / nKcal : null,
  };
}

export type Observacion = { texto: string; sugerencia: string };

const MAXIMO_OBSERVACIONES = 4;

/** Números en palabra: evita que queden dos cifras pegadas ("bajo 11 3 días"). */
const PALABRA = [
  "cero",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
];

/** El entrenamiento que puede cargar el tobillo: no cuenta descansar ni kine. */
function entrenoDeCarga(entrenamiento: string[] | null | undefined): boolean {
  return (entrenamiento ?? []).some(
    (t) => t !== "Descanso" && t !== "Kinesiología",
  );
}

/*
  Observaciones de la semana, como máximo 4 y en orden de prioridad.

  Todas describen lo que pasó y proponen algo concreto. Ninguna dice que algo
  se incumplió: un día estimado o un tiempo sin registrar son datos, no faltas.
*/
export function observaciones(
  semana: DiaSemana[],
  config: ConfigSemana,
): Observacion[] {
  const lista: Observacion[] = [];

  // Un día "con registro" es uno que tiene al menos una comida anotada.
  const conRegistro = (d: DiaSemana) => d.comidas.length > 0;

  // 1. Racha de proteicos bajo la meta.
  const metaProteicos = config.metas_porciones?.proteicos;
  if (metaProteicos != null && metaProteicos > 0) {
    let racha = 0;
    let mayor = 0;
    for (const d of semana) {
      const proteicos = d.totales.porciones.proteicos ?? 0;
      if (conRegistro(d) && proteicos < metaProteicos) {
        racha++;
        mayor = Math.max(mayor, racha);
      } else {
        racha = 0;
      }
    }
    if (mayor >= 3) {
      lista.push({
        texto: `Las proteicas quedaron bajo ${formatear(metaProteicos)} ${PALABRA[mayor] ?? mayor} días seguidos.`,
        sugerencia: "Un yogurt proteico en la colación PM cierra la diferencia.",
      });
    }
  }

  // 2. El tiempo de comida que más se salta, contando solo días con registro.
  const diasConRegistro = semana.filter(conRegistro);
  if (diasConRegistro.length > 0) {
    const saltos = TIEMPOS.map((t) => ({
      tiempo: t,
      veces: diasConRegistro.filter(
        (d) => !d.comidas.some((c) => c.tiempo === t.clave),
      ).length,
    }));
    // Empate: gana el primero en el orden de TIEMPOS.
    const peor = saltos.reduce((a, b) => (b.veces > a.veces ? b : a));
    if (peor.veces >= 1) {
      lista.push({
        texto: `La ${peor.tiempo.etiqueta.toLowerCase()} es la que más se salta: ${peor.veces} de 7 días.`,
        sugerencia: "Dejarla armada la noche anterior suele bastar.",
      });
    }
  }

  // 3. Tobillo peor justo después de un día de entrenamiento de carga.
  let tobilloDespues = 0;
  for (let i = 1; i < semana.length; i++) {
    if (
      entrenoDeCarga(semana[i - 1].dia?.entrenamiento) &&
      semana[i].dia?.estado_tobillo === "peor"
    ) {
      tobilloDespues++;
    }
  }
  if (tobilloDespues > 0) {
    lista.push({
      texto: `El tobillo estuvo peor ${tobilloDespues} ${tobilloDespues === 1 ? "día" : "días"} justo después de entrenar.`,
      sugerencia: "Vale la pena comentarlo en kinesiología.",
    });
  }

  // 4. Días con comidas fuera. No es una falla: se dice y se explica.
  const estimados = semana.filter((d) => d.estimado).length;
  if (estimados > 0) {
    lista.push({
      texto:
        estimados === 1
          ? "Un día tuvo una comida fuera de casa."
          : `${estimados} días tuvieron comidas fuera de casa.`,
      sugerencia: "Quedan registrados igual, marcados como estimados.",
    });
  }

  // 5. Agua bajo el 87,5% de la meta.
  const metaAgua = config.meta_agua_ml;
  const { agua } = promedios(
    semana.map((d) => d.dia).filter((d): d is DiaSemanaFila => d !== null),
  );
  if (metaAgua != null && metaAgua > 0 && agua != null && agua < metaAgua * 0.875) {
    lista.push({
      texto: "El agua promedió bajo la meta diaria.",
      sugerencia: "Los días de bicicleta conviene dejar la botella a la vista.",
    });
  }

  return lista.slice(0, MAXIMO_OBSERVACIONES);
}

/** Litros con dos decimales, redondeando a 50 ml: 1740 → "1,75 L". */
export function textoPromedioAgua(ml: number | null): string {
  if (ml == null) return "—";
  const redondeado = Math.round(ml / 50) * 50;
  return `${(redondeado / 1000).toFixed(2).replace(".", ",")} L`;
}

export function textoPromedioKcal(kcal: number | null): string {
  if (kcal == null) return "—";
  return `${Math.round(kcal)} kcal`;
}

/** La frase bajo el contador grande. Describe, no evalúa. */
export function fraseSemana(registrados: number): string {
  if (registrados >= 6) return "Semana bien cubierta.";
  if (registrados >= 3) return "Vas a mitad de camino esta semana.";
  return "Todavía quedan días por cerrar.";
}

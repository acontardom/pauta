import { ESTADOS_TOBILLO, GRUPOS, TIEMPOS } from "@/lib/dominio";
import type { Comida, Dia, Porciones } from "@/lib/supabase/tipos";

/*
  Cálculos del día a partir de sus comidas.

  Las comidas ESTIMADAS entran en los totales igual que las completas: comer
  fuera no es una falla, y sus porciones son parte de lo que se comió. Lo que
  cambia es cómo se presentan, no cómo se suman.
*/

export type EstadoComida = "completa" | "estimada" | "pendiente";

export type TotalesDia = {
  porciones: Porciones;
  kcal: number;
  /** Cuántas comidas aportaron kcal: si son 0, el contador muestra "—". */
  comidasConKcal: number;
};

export function totalesDia(comidas: Comida[]): TotalesDia {
  const porciones: Porciones = {};
  let kcal = 0;
  let comidasConKcal = 0;

  for (const comida of comidas) {
    for (const g of GRUPOS) {
      const v = comida.porciones?.[g.clave];
      if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
        // Se acumula redondeando a dos decimales: los pasos son de 0,5.
        porciones[g.clave] = Math.round(((porciones[g.clave] ?? 0) + v) * 100) / 100;
      }
    }
    if (comida.kcal != null) {
      kcal += comida.kcal;
      comidasConKcal++;
    }
  }

  return { porciones, kcal, comidasConKcal };
}

/** Una comida sin fila está pendiente; el modo "fuera" es la estimada. */
export function estadoComida(comida: Comida | undefined | null): EstadoComida {
  if (!comida) return "pendiente";
  return comida.modo === "fuera" ? "estimada" : "completa";
}

/** Litros con dos decimales fijas y coma: 1250 → "1,25 L". Hoja de cierre. */
export function textoAgua(ml: number): string {
  return `${(ml / 1000).toFixed(2).replace(".", ",")} L`;
}

/*
  Litros para la tarjeta de agua: hasta dos decimales, sin ceros de relleno.
  250 → "0,25", 2000 → "2", 2250 → "2,25".

  No usa lib/numeros.formatear porque ese redondea a UN decimal por contrato, y
  2250 ml saldría "2,3 L": el medio vaso de más desaparecería del texto.
*/
export function textoLitros(ml: number): string {
  const litros = Math.round((ml / 1000) * 100) / 100;
  return String(litros).replace(".", ",");
}

/** Tono de una fila del resumen. Nunca hay rojo: no existe tono de falla. */
export type TonoFila = "verde" | "azul" | "neutro";

export type FilaResumen = {
  etiqueta: string;
  valor: string;
  tono: TonoFila;
};

/*
  Las ocho filas de la hoja de cierre: las cinco comidas, agua, entrenamiento
  y tobillo. Pura y sin JSX, para poder probarla y para que el componente solo
  decida colores.

  Lo que falta se dice "Sin registro", en tono neutro, igual que en las leyendas. No hay texto que
  reproche: cerrar el día es registrar, no evaluar.
*/
export function resumenDia(
  comidas: Comida[],
  dia: Pick<
    Dia,
    "agua_ml" | "entrenamiento" | "estado_tobillo"
  > | null,
): FilaResumen[] {
  const porTiempo = new Map(comidas.map((c) => [c.tiempo, c]));

  const filas: FilaResumen[] = TIEMPOS.map((t) => {
    const comida = porTiempo.get(t.clave);
    const estado = estadoComida(comida);

    if (estado === "completa") {
      return {
        etiqueta: t.etiqueta,
        valor: comida!.nombre_menu || "Completa",
        tono: "verde",
      };
    }
    if (estado === "estimada") {
      return {
        etiqueta: t.etiqueta,
        valor: comida!.texto_libre || "Estimada",
        tono: "azul",
      };
    }
    return { etiqueta: t.etiqueta, valor: "Sin registro", tono: "neutro" };
  });

  filas.push({
    etiqueta: "Agua",
    valor: textoAgua(dia?.agua_ml ?? 0),
    tono: "azul",
  });

  // Tal como vino de la base, aunque ya no sea una opción. Sin minutos: la
  // columna entrenamiento_minutos quedó sin usar.
  const entrenamiento = dia?.entrenamiento ?? [];
  filas.push({
    etiqueta: "Entrenamiento",
    valor: entrenamiento.length > 0 ? entrenamiento.join(", ") : "Sin registro",
    tono: "neutro",
  });

  const tobillo = ESTADOS_TOBILLO.find((e) => e.clave === dia?.estado_tobillo);
  filas.push({
    etiqueta: "Tobillo",
    valor: tobillo?.etiqueta ?? "Sin registro",
    tono: "neutro",
  });

  return filas;
}

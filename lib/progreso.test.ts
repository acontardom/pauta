import { describe, expect, it } from "vitest";
import {
  ANCHO,
  delta,
  deltaInbody,
  progresoGrasa,
  serieGrafico,
  serieMultiple,
  tarjetasInbody,
  textoPctGrasa,
  ultimoYAnterior,
} from "./progreso";

type Fila = { fecha: string; peso: number | null; cintura: number | null };

function fila(fecha: string, peso: number | null, cintura: number | null = null): Fila {
  return { fecha, peso, cintura };
}

describe("ultimoYAnterior", () => {
  it("sin registros devuelve los dos en null", () => {
    expect(ultimoYAnterior([] as Fila[], "peso")).toEqual({
      actual: null,
      anterior: null,
    });
  });

  it("con un registro no hay anterior", () => {
    const r = ultimoYAnterior([fila("2026-09-01", 83.4)], "peso");
    expect(r.actual?.peso).toBe(83.4);
    expect(r.anterior).toBe(null);
  });

  it("devuelve los dos más recientes", () => {
    const r = ultimoYAnterior(
      [fila("2026-09-01", 83.4), fila("2026-09-08", 82.9), fila("2026-09-12", 82.1)],
      "peso",
    );
    expect(r.actual?.fecha).toBe("2026-09-12");
    expect(r.anterior?.fecha).toBe("2026-09-08");
  });

  it("ordena aunque lleguen desordenados", () => {
    const r = ultimoYAnterior(
      [fila("2026-09-12", 82.1), fila("2026-09-01", 83.4)],
      "peso",
    );
    expect(r.actual?.fecha).toBe("2026-09-12");
    expect(r.anterior?.fecha).toBe("2026-09-01");
  });

  it("ignora los registros con ese campo en null", () => {
    // Solo el primero y el último tienen cintura.
    const registros = [
      fila("2026-09-01", 83.4, 95.7),
      fila("2026-09-08", 82.9, null),
      fila("2026-09-12", 82.1, 95.2),
    ];
    const r = ultimoYAnterior(registros, "cintura");
    expect(r.actual?.fecha).toBe("2026-09-12");
    expect(r.anterior?.fecha).toBe("2026-09-01");
  });

  it("un registro de solo peso no cuenta como dato de cintura", () => {
    const r = ultimoYAnterior([fila("2026-09-01", 83.4, null)], "cintura");
    expect(r.actual).toBe(null);
  });
});

describe("delta", () => {
  const anterior = { valor: 83.4, fecha: "2026-09-01" };

  it("sin anterior dice que es el primero", () => {
    expect(delta({ valor: 83.4, fecha: "2026-09-01" }, null, "kg")).toEqual({
      texto: "Primer registro",
      tono: "neutro",
    });
    expect(delta(null, null, "kg").texto).toBe("Primer registro");
  });

  it("bajar es bueno y va con el signo menos real", () => {
    const d = delta({ valor: 82.9, fecha: "2026-09-12" }, anterior, "kg");
    expect(d).toEqual({
      texto: "−0,5 kg desde el 1 de septiembre",
      tono: "bueno",
    });
    // U+2212, no un guion común.
    expect(d.texto.startsWith("−")).toBe(true);
  });

  it("subir es neutro, nunca una falla", () => {
    const d = delta({ valor: 83.8, fecha: "2026-09-12" }, anterior, "kg");
    expect(d).toEqual({
      texto: "+0,4 kg desde el 1 de septiembre",
      tono: "neutro",
    });
  });

  it("quedar igual también es neutro", () => {
    const d = delta({ valor: 83.4, fecha: "2026-09-12" }, anterior, "kg");
    expect(d.tono).toBe("neutro");
    expect(d.texto).toBe("+0 kg desde el 1 de septiembre");
  });

  it("usa la unidad que se le pase", () => {
    const d = delta(
      { valor: 95.2, fecha: "2026-09-12" },
      { valor: 95.7, fecha: "2026-09-01" },
      "cm",
    );
    expect(d.texto).toBe("−0,5 cm desde el 1 de septiembre");
  });
});

describe("serieGrafico", () => {
  it("sin registros devuelve todo vacío", () => {
    const s = serieGrafico([] as Fila[], "peso", 76.5);
    expect(s.puntos).toEqual([]);
    expect(s.path).toBe("");
    expect(s.etiquetas).toEqual([]);
    expect(s.metaY).toBe(null);
  });

  it("ignora los registros con el campo en null", () => {
    const s = serieGrafico(
      [fila("2026-09-01", null, 95.7), fila("2026-09-12", 82.1, null)],
      "peso",
      76.5,
    );
    expect(s.puntos).toHaveLength(1);
    expect(s.puntos[0].valor).toBe(82.1);
  });

  describe("con un solo punto", () => {
    it("no dibuja línea y lo centra en los dos ejes", () => {
      const s = serieGrafico([fila("2026-09-01", 83.4)], "peso", 76.5);
      expect(s.puntos).toHaveLength(1);
      expect(s.path).toBe("");
      expect(s.puntos[0].x).toBe(ANCHO / 2);
      // Centro vertical del área de datos: (14 + 100) / 2.
      expect(s.puntos[0].y).toBe(57);
    });

    it("igual ubica la meta en su posición real, debajo del punto", () => {
      const s = serieGrafico([fila("2026-09-01", 83.4)], "peso", 76.5);
      expect(s.metaY).not.toBe(null);
      // La meta es menor que el peso, así que va más abajo en la pantalla.
      expect(s.metaY!).toBeGreaterThan(s.puntos[0].y);
    });

    it("sin meta no revienta ni deja la y en NaN", () => {
      const s = serieGrafico([fila("2026-09-01", 83.4)], "peso", null);
      expect(s.metaY).toBe(null);
      expect(Number.isFinite(s.puntos[0].y)).toBe(true);
      expect(s.puntos[0].y).toBe(57);
    });

    it("una sola etiqueta, centrada", () => {
      const s = serieGrafico([fila("2026-09-01", 83.4)], "peso", 76.5);
      expect(s.etiquetas).toEqual([
        { x: ANCHO / 2, texto: "1 sep", anclaje: "middle" },
      ]);
    });
  });

  describe("con dos puntos", () => {
    const s = serieGrafico(
      [fila("2026-09-01", 83.4), fila("2026-09-12", 82.9)],
      "peso",
      76.5,
    );

    it("dibuja la línea de un punto al otro", () => {
      expect(s.puntos).toHaveLength(2);
      expect(s.path).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    });

    it("va de borde a borde en el eje x", () => {
      expect(s.puntos[0].x).toBe(6);
      expect(s.puntos[1].x).toBe(314);
    });

    it("etiqueta solo la primera y la última", () => {
      expect(s.etiquetas.map((e) => e.texto)).toEqual(["1 sep", "12 sep"]);
      expect(s.etiquetas.map((e) => e.anclaje)).toEqual(["start", "end"]);
    });

    it("el valor mayor queda más arriba", () => {
      expect(s.puntos[0].y).toBeLessThan(s.puntos[1].y);
    });
  });

  it("con tres o más puntos agrega la etiqueta del medio", () => {
    const s = serieGrafico(
      [
        fila("2026-09-01", 83.4),
        fila("2026-09-06", 83.0),
        fila("2026-09-12", 82.5),
      ],
      "peso",
      76.5,
    );
    expect(s.etiquetas.map((e) => e.texto)).toEqual([
      "1 sep",
      "6 sep",
      "12 sep",
    ]);
    expect(s.etiquetas.map((e) => e.anclaje)).toEqual([
      "start",
      "middle",
      "end",
    ]);
  });

  it("una serie plana no divide por cero y queda toda a la misma altura", () => {
    const s = serieGrafico(
      [
        fila("2026-09-01", 83.4),
        fila("2026-09-06", 83.4),
        fila("2026-09-12", 83.4),
      ],
      "peso",
      null,
    );
    const alturas = s.puntos.map((p) => p.y);
    expect(alturas.every((y) => Number.isFinite(y))).toBe(true);
    expect(new Set(alturas).size).toBe(1);
    expect(alturas[0]).toBe(57);
  });

  it("una meta fuera del rango de los datos entra igual en la escala", () => {
    // La meta (60) está muy por debajo de los pesos.
    const s = serieGrafico(
      [fila("2026-09-01", 83.4), fila("2026-09-12", 82.9)],
      "peso",
      60,
    );
    expect(s.metaY).not.toBe(null);
    // Cae dentro del área dibujable, no fuera del viewBox.
    expect(s.metaY!).toBeGreaterThanOrEqual(14);
    expect(s.metaY!).toBeLessThanOrEqual(100);
    // Y los puntos siguen dentro.
    for (const p of s.puntos) {
      expect(p.y).toBeGreaterThanOrEqual(14);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("una meta por encima de los datos también entra", () => {
    const s = serieGrafico(
      [fila("2026-09-01", 83.4), fila("2026-09-12", 82.9)],
      "peso",
      120,
    );
    expect(s.metaY!).toBeGreaterThanOrEqual(14);
    expect(s.metaY!).toBeLessThanOrEqual(100);
  });
});

describe("progresoGrasa", () => {
  it("en el punto de partida el avance es 0", () => {
    expect(progresoGrasa(20, 20, 13)).toBe(0);
  });

  it("a mitad de camino es 0,5", () => {
    expect(progresoGrasa(16.5, 20, 13)).toBeCloseTo(0.5);
  });

  it("al alcanzar la meta es 1 y no pasa de ahí", () => {
    expect(progresoGrasa(13, 20, 13)).toBe(1);
    expect(progresoGrasa(11, 20, 13)).toBe(1);
  });

  it("si subió respecto del inicio, no baja de 0", () => {
    expect(progresoGrasa(22, 20, 13)).toBe(0);
  });

  it("sin alguno de los tres valores devuelve 0", () => {
    expect(progresoGrasa(null, 20, 13)).toBe(0);
    expect(progresoGrasa(20, null, 13)).toBe(0);
    expect(progresoGrasa(20, 20, null)).toBe(0);
  });

  it("con la meta igual o por encima del inicio, solo importa si se alcanzó", () => {
    expect(progresoGrasa(20, 20, 20)).toBe(1);
    expect(progresoGrasa(21, 20, 20)).toBe(0);
    expect(progresoGrasa(19, 20, 25)).toBe(1);
  });
});

describe("textoPctGrasa", () => {
  it("muestra siempre un decimal, para que se lea como medición", () => {
    // formatear(20) daría "20"; acá el ",0" comunica precisión.
    expect(textoPctGrasa(20)).toBe("20,0");
    expect(textoPctGrasa(13.2)).toBe("13,2");
    expect(textoPctGrasa(16.75)).toBe("16,8");
  });

  it("sin valor muestra raya", () => {
    expect(textoPctGrasa(null)).toBe("—");
    expect(textoPctGrasa(undefined)).toBe("—");
  });
});

describe("deltaInbody", () => {
  it("bajar es bueno en un campo que baja", () => {
    expect(deltaInbody(15.8, 16.7, "baja")).toEqual({ texto: "−0,9", tono: "bueno" });
  });

  it("subir es malo en un campo que baja", () => {
    expect(deltaInbody(17.1, 16.7, "baja")).toEqual({ texto: "+0,4", tono: "malo" });
  });

  it("subir es bueno en un campo que sube", () => {
    expect(deltaInbody(38.8, 38.6, "sube")).toEqual({ texto: "+0,2", tono: "bueno" });
  });

  it("una baja de masa musculoesquelética es mala, no neutra", () => {
    expect(deltaInbody(38.1, 38.6, "sube")).toEqual({ texto: "−0,5", tono: "malo" });
  });

  it("sin cambio es ±0 y neutro, sin residuo de punto flotante", () => {
    expect(deltaInbody(66.7, 66.7, "sube")).toEqual({ texto: "±0", tono: "neutro" });
    // 0,1 + 0,2 no es exactamente 0,3 en punto flotante.
    expect(deltaInbody(0.1 + 0.2, 0.3, "baja")).toEqual({ texto: "±0", tono: "neutro" });
  });

  it("sin alguno de los dos valores no hay delta", () => {
    expect(deltaInbody(null, 16.7, "baja")).toEqual({ texto: "", tono: "neutro" });
    expect(deltaInbody(15.8, null, "baja")).toEqual({ texto: "", tono: "neutro" });
    expect(deltaInbody(undefined, undefined, "sube")).toEqual({ texto: "", tono: "neutro" });
  });
});

describe("serieMultiple", () => {
  const serie = (id: string, datos: [string, number | null][]) => ({
    id,
    datos: datos.map(([fecha, valor]) => ({ fecha, valor })),
  });

  it("sin datos devuelve series vacías y sin etiquetas", () => {
    const g = serieMultiple([serie("grasa", []), serie("musculo", [])]);
    expect(g.series.map((s) => s.puntos)).toEqual([[], []]);
    expect(g.etiquetas).toEqual([]);
  });

  it("las dos series comparten la escala vertical", () => {
    const g = serieMultiple([
      serie("grasa", [["2026-09-01", 16.7], ["2026-09-12", 15.8]]),
      serie("musculo", [["2026-09-01", 38.6], ["2026-09-12", 38.8]]),
    ]);
    const [grasa, musculo] = g.series;
    // La masa grasa es menor, así que va más abajo que el músculo.
    expect(grasa.puntos[0].y).toBeGreaterThan(musculo.puntos[0].y);
    const ys = [...grasa.puntos, ...musculo.puntos].map((p) => p.y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(14);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(grasa.path).not.toBe("");
    expect(musculo.path).not.toBe("");
  });

  it("ignora los nulls y alinea por fecha, no por posición", () => {
    const g = serieMultiple([
      serie("grasa", [["2026-09-01", 16.7], ["2026-09-06", 16.2], ["2026-09-12", 15.8]]),
      // Al músculo le falta el dato del día 6.
      serie("musculo", [["2026-09-01", 38.6], ["2026-09-06", null], ["2026-09-12", 38.8]]),
    ]);
    const [grasa, musculo] = g.series;
    expect(musculo.puntos).toHaveLength(2);
    // El último punto de las dos series cae en la misma x: la del día 12.
    expect(musculo.puntos[1].x).toBe(grasa.puntos[2].x);
    expect(g.etiquetas.map((e) => e.texto)).toEqual(["1 sep", "6 sep", "12 sep"]);
  });

  it("con una sola fecha centra los puntos y no dibuja línea", () => {
    const g = serieMultiple([
      serie("grasa", [["2026-09-01", 16.7]]),
      serie("musculo", [["2026-09-01", 38.6]]),
    ]);
    expect(g.series[0].path).toBe("");
    expect(g.series[0].puntos[0].x).toBe(ANCHO / 2);
  });
});

describe("tarjetasInbody", () => {
  const primera = {
    fecha: "2026-09-01",
    peso: 83.4,
    masa_grasa: 16.7,
    pct_grasa: 20,
    masa_musculoesqueletica: 38.6,
    masa_libre_grasa: 66.7,
    agua_total: 48.7,
  };
  const segunda = {
    fecha: "2026-09-12",
    peso: 82.5,
    masa_grasa: 15.8,
    pct_grasa: 19.2,
    masa_musculoesqueletica: 38.8,
    masa_libre_grasa: 66.7,
    agua_total: 48.9,
  };

  it("con una sola medición no hay deltas", () => {
    const [t] = tarjetasInbody([primera]);
    expect(t.titulo).toBe("1 de septiembre");
    expect(t.referencia).toBe("primera medición");
    expect(t.filas).toHaveLength(6);
    expect(t.filas.map((f) => f.valor)).toEqual([
      "83,4 kg",
      "16,7 kg",
      "20,0%",
      "38,6 kg",
      "66,7 kg",
      "48,7 L",
    ]);
    for (const f of t.filas) expect(f.delta).toEqual({ texto: "", tono: "neutro" });
  });

  it("con dos, la más reciente va primero y se compara con la anterior", () => {
    const tarjetas = tarjetasInbody([primera, segunda]);
    expect(tarjetas.map((t) => t.titulo)).toEqual(["12 de septiembre", "1 de septiembre"]);
    expect(tarjetas[0].referencia).toBe("vs. 1/9");

    const fila = (clave: string) => tarjetas[0].filas.find((f) => f.clave === clave)!;
    expect(fila("masa_grasa").delta).toEqual({ texto: "−0,9", tono: "bueno" });
    expect(fila("masa_musculoesqueletica").delta).toEqual({ texto: "+0,2", tono: "bueno" });
    expect(fila("pct_grasa").delta).toEqual({ texto: "−0,8", tono: "bueno" });
    expect(fila("masa_libre_grasa").delta).toEqual({ texto: "±0", tono: "neutro" });
  });

  it("marca como destacados el % de grasa y la masa musculoesquelética", () => {
    const [t] = tarjetasInbody([primera]);
    expect(t.filas.filter((f) => f.destacada).map((f) => f.clave)).toEqual([
      "pct_grasa",
      "masa_musculoesqueletica",
    ]);
  });

  it("un campo en null muestra raya y no genera delta en ninguna de las dos", () => {
    const sinAgua = { ...segunda, agua_total: null };
    const tarjetas = tarjetasInbody([primera, sinAgua]);
    const agua = tarjetas[0].filas.find((f) => f.clave === "agua_total")!;
    expect(agua.valor).toBe("—");
    expect(agua.delta).toEqual({ texto: "", tono: "neutro" });

    // Y si la anterior tenía el null, la siguiente tampoco tiene delta.
    const siguiente = { ...segunda, fecha: "2026-09-20", agua_total: 49 };
    const agua2 = tarjetasInbody([primera, sinAgua, siguiente])[0].filas.find(
      (f) => f.clave === "agua_total",
    )!;
    expect(agua2.valor).toBe("49 L");
    expect(agua2.delta.texto).toBe("");
  });

  it("una baja de masa musculoesquelética queda en tono malo", () => {
    const menosMusculo = { ...segunda, masa_musculoesqueletica: 38.1 };
    const [t] = tarjetasInbody([primera, menosMusculo]);
    const musculo = t.filas.find((f) => f.clave === "masa_musculoesqueletica")!;
    expect(musculo.delta).toEqual({ texto: "−0,5", tono: "malo" });
  });

  it("dos mediciones el mismo día respetan el orden de llegada", () => {
    const manana = { ...primera, peso: 83.0 };
    const tarde = { ...primera, peso: 83.6 };
    const [reciente] = tarjetasInbody([manana, tarde]);
    expect(reciente.medicion.peso).toBe(83.6);
    expect(reciente.referencia).toBe("vs. 1/9");
  });
});


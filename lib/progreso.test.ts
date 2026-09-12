import { describe, expect, it } from "vitest";
import {
  ANCHO,
  delta,
  progresoGrasa,
  serieGrafico,
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

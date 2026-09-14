import { describe, expect, it } from "vitest";
import {
  celdasEjercicio,
  ejerciciosEnOrden,
  etiquetaPestana,
  opcionesEntrenamiento,
  rutinaInicial,
} from "./rutinas";

const RUTINAS = [
  { id: "a", clave: "A", nombre: "Empuje + core" },
  { id: "b", clave: "B", nombre: "Tirón + core" },
];

describe("opcionesEntrenamiento", () => {
  it("solo las sesiones de las rutinas, en su orden y con su nombre", () => {
    expect(opcionesEntrenamiento(RUTINAS)).toEqual([
      { etiqueta: "Sesión A", nombre: "Empuje + core" },
      { etiqueta: "Sesión B", nombre: "Tirón + core" },
    ]);
  });

  it("sin rutinas no hay opciones", () => {
    expect(opcionesEntrenamiento([])).toEqual([]);
  });

  it("dos rutinas activas con la misma clave dan una sola opción", () => {
    expect(
      opcionesEntrenamiento([
        { clave: "A", nombre: "Primera" },
        { clave: "A", nombre: "Segunda" },
      ]),
    ).toEqual([{ etiqueta: "Sesión A", nombre: "Primera" }]);
  });
});

describe("rutinaInicial", () => {
  it("abre en la sesión marcada", () => {
    expect(rutinaInicial(RUTINAS, ["Sesión B"])).toBe("b");
    expect(rutinaInicial(RUTINAS, ["Bicicleta", "Sesión B"])).toBe("b");
  });

  it("con las dos o ninguna, abre en la primera", () => {
    expect(rutinaInicial(RUTINAS, ["Sesión A", "Sesión B"])).toBe("a");
    expect(rutinaInicial(RUTINAS, [])).toBe("a");
    expect(rutinaInicial(RUTINAS, ["Tren superior"])).toBe("a");
  });

  it("sin rutinas no hay pestaña", () => {
    expect(rutinaInicial([], ["Sesión A"])).toBeNull();
  });
});

describe("etiquetaPestana", () => {
  it("clave y nombre", () => {
    expect(etiquetaPestana(RUTINAS[0])).toBe("A · Empuje + core");
  });
});

describe("celdasEjercicio", () => {
  it("series, reps y descanso", () => {
    expect(celdasEjercicio({ series: 4, reps: "8-12", descanso_seg: 90 })).toEqual([
      { etiqueta: "Series", valor: "4" },
      { etiqueta: "Reps", valor: "8-12" },
      { etiqueta: "Descanso", valor: "90 s" },
    ]);
  });

  it("las reps con texto van tal cual, y sin descanso va un guion", () => {
    expect(
      celdasEjercicio({ series: 3, reps: " 10 por lado ", descanso_seg: null }),
    ).toEqual([
      { etiqueta: "Series", valor: "3" },
      { etiqueta: "Reps", valor: "10 por lado" },
      { etiqueta: "Descanso", valor: "—" },
    ]);
  });
});

describe("ejerciciosEnOrden", () => {
  it("ordena por orden y deja al final los que no lo tienen", () => {
    const e = (nombre: string, orden: number | null) => ({
      nombre,
      orden,
      series: 3,
      reps: "10",
    });
    expect(
      ejerciciosEnOrden([e("c", null), e("b", 2), e("a", 1), e("d", null)]).map(
        (x) => x.nombre,
      ),
    ).toEqual(["a", "b", "c", "d"]);
  });
});

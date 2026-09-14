import { describe, expect, it } from "vitest";
import {
  ejerciciosEnOrden,
  etiquetaPestana,
  opcionesEntrenamiento,
  rutinaInicial,
  textoEjercicio,
} from "./rutinas";

const RUTINAS = [
  { id: "a", clave: "A", nombre: "Empuje + core" },
  { id: "b", clave: "B", nombre: "Tirón + core" },
];

describe("opcionesEntrenamiento", () => {
  it("una sesión por rutina, en su orden, y después las fijas", () => {
    expect(opcionesEntrenamiento(RUTINAS)).toEqual([
      "Sesión A",
      "Sesión B",
      "Bicicleta",
      "Kinesiología",
      "Descanso",
    ]);
  });

  it("sin rutinas quedan solo las fijas", () => {
    expect(opcionesEntrenamiento([])).toEqual(["Bicicleta", "Kinesiología", "Descanso"]);
  });

  it("dos rutinas activas con la misma clave dan una sola opción", () => {
    expect(opcionesEntrenamiento([{ clave: "A" }, { clave: "A" }])).toEqual([
      "Sesión A",
      "Bicicleta",
      "Kinesiología",
      "Descanso",
    ]);
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

describe("textoEjercicio", () => {
  it("series, reps y descanso", () => {
    expect(textoEjercicio({ series: 4, reps: "8-12", descanso_seg: 90 })).toBe(
      "4 series · 8-12 reps · 90 s",
    );
    expect(textoEjercicio({ series: 2, reps: "12", descanso_seg: 60 })).toBe(
      "2 series · 12 reps · 60 s",
    );
  });

  it("reps con texto no llevan la palabra reps", () => {
    expect(textoEjercicio({ series: 3, reps: "10 por lado", descanso_seg: 60 })).toBe(
      "3 series · 10 por lado · 60 s",
    );
  });

  it("singular y sin descanso", () => {
    expect(textoEjercicio({ series: 1, reps: "1", descanso_seg: null })).toBe(
      "1 serie · 1 rep",
    );
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

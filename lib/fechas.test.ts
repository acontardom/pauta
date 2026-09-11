import { describe, expect, it } from "vitest";
import {
  diferenciaDias,
  formatoCorto,
  formatoLargo,
  formatoLargoConAnio,
  hoyChile,
  sumarDias,
} from "./fechas";

describe("hoyChile", () => {
  it("usa el día calendario chileno en horario de verano", () => {
    // 01:30 UTC del 12 = 22:30 del 11 en Chile (UTC-3).
    expect(hoyChile(new Date("2026-09-12T01:30:00Z"))).toBe("2026-09-11");
  });

  it("usa el día calendario chileno en horario de invierno", () => {
    // 03:30 UTC del 1 = 23:30 del 30 en Chile (UTC-4).
    expect(hoyChile(new Date("2026-07-01T03:30:00Z"))).toBe("2026-06-30");
  });
});

describe("sumarDias", () => {
  it("cruza el cambio de horario sin perder el día", () => {
    expect(sumarDias("2026-09-05", 2)).toBe("2026-09-07");
  });

  it("resta días y cruza el fin de mes", () => {
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("cruza el fin de año", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("diferenciaDias", () => {
  it("cuenta días calendario a través de los dos cambios de horario", () => {
    expect(diferenciaDias("2026-09-04", "2027-01-01")).toBe(119);
  });

  it("es cero en el mismo día y negativa hacia atrás", () => {
    expect(diferenciaDias("2026-09-11", "2026-09-11")).toBe(0);
    expect(diferenciaDias("2026-09-11", "2026-09-04")).toBe(-7);
  });
});

describe("formatos", () => {
  it("formatoLargo", () => {
    expect(formatoLargo("2026-09-11")).toBe("Viernes 11 de septiembre");
  });

  it("formatoLargoConAnio", () => {
    expect(formatoLargoConAnio("2026-09-25")).toBe("25 de septiembre de 2026");
  });

  it("formatoCorto", () => {
    expect(formatoCorto("2026-09-11")).toBe("11 sep");
  });
});

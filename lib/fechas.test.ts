import { describe, expect, it } from "vitest";
import {
  diaDelMes,
  diferenciaDias,
  formatoCorto,
  formatoLargo,
  formatoLargoConAnio,
  hoyChile,
  inicialDia,
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

describe("inicialDia y diaDelMes", () => {
  it("da la inicial del día en hora de Chile", () => {
    // 2026-09-11 es viernes.
    expect(inicialDia("2026-09-11")).toBe("V");
    expect(inicialDia("2026-09-12")).toBe("S");
    expect(inicialDia("2026-09-13")).toBe("D");
    expect(inicialDia("2026-09-14")).toBe("L");
    expect(inicialDia("2026-09-15")).toBe("M");
    expect(inicialDia("2026-09-16")).toBe("M");
    expect(inicialDia("2026-09-17")).toBe("J");
  });

  it("no se corre por el cambio de horario", () => {
    // El cambio de horario chileno de 2026 cae el 6 de septiembre.
    expect(inicialDia("2026-09-05")).toBe("S");
    expect(inicialDia("2026-09-06")).toBe("D");
    expect(inicialDia("2026-09-07")).toBe("L");
  });

  it("da el número del día sin el cero de relleno", () => {
    expect(diaDelMes("2026-09-11")).toBe(11);
    expect(diaDelMes("2026-09-01")).toBe(1);
  });
});

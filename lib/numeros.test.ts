import { describe, expect, it } from "vitest";
import { formatear, parsear } from "./numeros";

describe("formatear", () => {
  it("usa coma decimal", () => {
    expect(formatear(1.5)).toBe("1,5");
  });

  it("no agrega \",0\" a los enteros", () => {
    expect(formatear(11)).toBe("11");
  });

  it("redondea a un decimal", () => {
    expect(formatear(72.44)).toBe("72,4");
    expect(formatear(72.46)).toBe("72,5");
  });

  it("muestra raya cuando no hay valor", () => {
    expect(formatear(null)).toBe("—");
    expect(formatear(undefined)).toBe("—");
  });
});

describe("parsear", () => {
  it("acepta coma y punto", () => {
    expect(parsear("1,5")).toBe(1.5);
    expect(parsear("1.5")).toBe(1.5);
    expect(parsear("11")).toBe(11);
  });

  it("rechaza texto que no es número", () => {
    expect(parsear("abc")).toBe(null);
    expect(parsear("")).toBe(null);
    expect(parsear("1,2,3")).toBe(null);
  });
});

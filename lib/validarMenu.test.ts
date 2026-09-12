import { describe, expect, it } from "vitest";
import { MAXIMO_NOMBRE, validarMenu, type EntradaMenu } from "./validarMenu";

function entrada(extra: Partial<EntradaMenu> = {}): EntradaMenu {
  return {
    nombre: "Pollo con arroz",
    tiempo: "almuerzo",
    ingredientes: "150 g pollo\n1 taza arroz cocido",
    observacion: "",
    porciones: { cereales: 1, verduras: 2, proteicos: 4, aceite: 0.5 },
    kcal: 600,
    ...extra,
  };
}

describe("validarMenu", () => {
  it("acepta y normaliza un menú válido", () => {
    const r = validarMenu(entrada());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu).toEqual({
      nombre: "Pollo con arroz",
      tiempo: "almuerzo",
      ingredientes: ["150 g pollo", "1 taza arroz cocido"],
      observacion: null,
      porciones: { cereales: 1, verduras: 2, proteicos: 4, aceite: 0.5 },
      kcal: 600,
    });
  });

  describe("nombre", () => {
    it("rechaza vacío y solo espacios", () => {
      expect(validarMenu(entrada({ nombre: "" })).ok).toBe(false);
      expect(validarMenu(entrada({ nombre: "   " })).ok).toBe(false);
    });

    it("le hace trim", () => {
      const r = validarMenu(entrada({ nombre: "  Pan con huevos  " }));
      expect(r.ok && r.menu.nombre).toBe("Pan con huevos");
    });

    it("acepta 80 caracteres y rechaza 81", () => {
      expect(validarMenu(entrada({ nombre: "a".repeat(MAXIMO_NOMBRE) })).ok).toBe(
        true,
      );
      const r = validarMenu(entrada({ nombre: "a".repeat(MAXIMO_NOMBRE + 1) }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("80");
    });
  });

  describe("tiempo", () => {
    it("acepta los cinco", () => {
      for (const t of [
        "desayuno",
        "colacion_am",
        "almuerzo",
        "colacion_pm",
        "cena",
      ]) {
        expect(validarMenu(entrada({ tiempo: t })).ok).toBe(true);
      }
    });

    it("rechaza cualquier otro", () => {
      expect(validarMenu(entrada({ tiempo: "once" })).ok).toBe(false);
      expect(validarMenu(entrada({ tiempo: "" })).ok).toBe(false);
    });
  });

  describe("ingredientes", () => {
    it("descarta las líneas vacías y hace trim", () => {
      const r = validarMenu(
        entrada({ ingredientes: "  150 g pollo  \n\n   \n1 taza arroz\n" }),
      );
      expect(r.ok && r.menu.ingredientes).toEqual([
        "150 g pollo",
        "1 taza arroz",
      ]);
    });

    it("acepta ninguno", () => {
      const r = validarMenu(entrada({ ingredientes: "" }));
      expect(r.ok && r.menu.ingredientes).toEqual([]);
    });
  });

  describe("observación", () => {
    it("vacía queda en null", () => {
      expect(validarMenu(entrada({ observacion: "" })).ok).toBe(true);
      const r = validarMenu(entrada({ observacion: "   " }));
      expect(r.ok && r.menu.observacion).toBe(null);
    });

    it("con texto queda con trim", () => {
      const r = validarMenu(entrada({ observacion: "  Pesar el pollo  " }));
      expect(r.ok && r.menu.observacion).toBe("Pesar el pollo");
    });
  });

  describe("porciones", () => {
    it("rechaza aceite 0,3", () => {
      const r = validarMenu(entrada({ porciones: { aceite: 0.3 } }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("0,5");
    });

    it("rechaza proteicos 1,5: su paso es 1", () => {
      expect(validarMenu(entrada({ porciones: { proteicos: 1.5 } })).ok).toBe(
        false,
      );
    });

    it("acepta medios en aceite y grasas", () => {
      expect(
        validarMenu(entrada({ porciones: { aceite: 0.5, grasas: 1.5 } })).ok,
      ).toBe(true);
    });

    it("rechaza un grupo inventado y valores negativos", () => {
      expect(
        validarMenu(entrada({ porciones: { proteina: 2 } as never })).ok,
      ).toBe(false);
      expect(validarMenu(entrada({ porciones: { cereales: -1 } })).ok).toBe(
        false,
      );
    });

    it("quita los ceros del resultado", () => {
      const r = validarMenu(
        entrada({ porciones: { cereales: 1, verduras: 0, aceite: 0 } }),
      );
      expect(r.ok && r.menu.porciones).toEqual({ cereales: 1 });
    });

    it("acepta un menú sin porciones", () => {
      const r = validarMenu(entrada({ porciones: {} }));
      expect(r.ok && r.menu.porciones).toEqual({});
    });
  });

  describe("kcal", () => {
    it("acepta entero >= 0 y null", () => {
      expect(validarMenu(entrada({ kcal: 0 })).ok).toBe(true);
      expect(validarMenu(entrada({ kcal: 520 })).ok).toBe(true);
      expect(validarMenu(entrada({ kcal: null })).ok).toBe(true);
    });

    it("rechaza negativas y decimales", () => {
      expect(validarMenu(entrada({ kcal: -10 })).ok).toBe(false);
      expect(validarMenu(entrada({ kcal: 12.5 })).ok).toBe(false);
    });
  });
});

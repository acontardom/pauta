import { describe, expect, it } from "vitest";
import {
  CONFIGURACION_POR_DEFECTO,
  formularioDesdeConfiguracion,
  validarConfiguracion,
  type ConfiguracionFormulario,
} from "./validarConfiguracion";

/** El formulario con los valores de la semilla, con cambios encima. */
function formulario(
  cambios: Partial<Omit<ConfiguracionFormulario, "metas_porciones" | "horarios">> & {
    metas_porciones?: Partial<ConfiguracionFormulario["metas_porciones"]>;
    horarios?: Partial<ConfiguracionFormulario["horarios"]>;
  } = {},
): ConfiguracionFormulario {
  const base = formularioDesdeConfiguracion(null);
  return {
    ...base,
    ...cambios,
    metas_porciones: { ...base.metas_porciones, ...cambios.metas_porciones },
    horarios: { ...base.horarios, ...cambios.horarios },
  } as ConfiguracionFormulario;
}

function campos(f: ConfiguracionFormulario) {
  const r = validarConfiguracion(f);
  return r.ok ? [] : r.errores.map((e) => e.campo);
}

describe("formularioDesdeConfiguracion", () => {
  it("sin fila usa los valores por defecto, con coma decimal", () => {
    const f = formularioDesdeConfiguracion(null);
    expect(f.metas_porciones.grasas).toBe("1,5");
    expect(f.metas_porciones.proteicos).toBe("11");
    expect(f.meta_peso).toBe("76,5");
    expect(f.horarios.cena).toBe("20:00");
    expect(f.fecha_retorno).toBe("2027-01-01");
  });

  it("con fila usa lo guardado y deja vacío lo que falta", () => {
    const f = formularioDesdeConfiguracion({
      ...CONFIGURACION_POR_DEFECTO,
      meta_peso: null,
      horarios: null,
      metas_porciones: { cereales: 2 },
    });
    expect(f.meta_peso).toBe("");
    expect(f.horarios.cena).toBe("");
    expect(f.metas_porciones.cereales).toBe("2");
    expect(f.metas_porciones.aceite).toBe("");
  });

  it("no redondea: 76,55 vuelve como 76,55", () => {
    const f = formularioDesdeConfiguracion({ ...CONFIGURACION_POR_DEFECTO, meta_peso: 76.55 });
    expect(f.meta_peso).toBe("76,55");
  });
});

describe("validarConfiguracion", () => {
  it("los valores de la semilla son válidos y vuelven normalizados", () => {
    expect(validarConfiguracion(formulario())).toEqual({
      ok: true,
      configuracion: CONFIGURACION_POR_DEFECTO,
    });
  });

  describe("metas de porciones", () => {
    it("aceite 0,3 no pasa, con un mensaje que explica el paso", () => {
      const r = validarConfiguracion(formulario({ metas_porciones: { aceite: "0,3" } }));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.errores).toEqual([
          { campo: "metas_porciones.aceite", mensaje: "Aceite: de 0,5 en 0,5", detalle: "de 0,5 en 0,5" },
        ]);
      }
    });

    it("proteicos solo acepta enteros", () => {
      const r = validarConfiguracion(formulario({ metas_porciones: { proteicos: "10,5" } }));
      expect(!r.ok && r.errores[0].mensaje).toBe("Proteicos: solo números enteros");
    });

    it("acepta medios en grasas, con coma o punto", () => {
      expect(campos(formulario({ metas_porciones: { grasas: "2,5" } }))).toEqual([]);
      expect(campos(formulario({ metas_porciones: { grasas: "2.5" } }))).toEqual([]);
    });

    it("las siete son obligatorias y no pueden ser negativas", () => {
      expect(campos(formulario({ metas_porciones: { fruta: "" } }))).toEqual(["metas_porciones.fruta"]);
      expect(campos(formulario({ metas_porciones: { fruta: "-1" } }))).toEqual(["metas_porciones.fruta"]);
    });

    it("una meta en 0 es válida", () => {
      expect(campos(formulario({ metas_porciones: { fruta: "0" } }))).toEqual([]);
    });

    it("cambiar proteicos a 10 guarda 10", () => {
      const r = validarConfiguracion(formulario({ metas_porciones: { proteicos: "10" } }));
      expect(r.ok && r.configuracion.metas_porciones.proteicos).toBe(10);
    });
  });

  describe("agua", () => {
    it("tiene que ser un entero mayor que cero", () => {
      expect(campos(formulario({ meta_agua_ml: "" }))).toEqual(["meta_agua_ml"]);
      expect(campos(formulario({ meta_agua_ml: "0" }))).toEqual(["meta_agua_ml"]);
      expect(campos(formulario({ meta_agua_ml: "1500,5" }))).toEqual(["meta_agua_ml"]);
      expect(campos(formulario({ meta_agua_ml: "2500" }))).toEqual([]);
    });
  });

  describe("metas objetivo", () => {
    it("pueden quedar vacías y se guardan en null", () => {
      const r = validarConfiguracion(formulario({ meta_peso: "", meta_cintura: "", meta_pct_grasa: "" }));
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.configuracion.meta_peso).toBe(null);
        expect(r.configuracion.meta_cintura).toBe(null);
        expect(r.configuracion.meta_pct_grasa).toBe(null);
      }
    });

    it("el % de grasa va entre 0 y 100", () => {
      expect(campos(formulario({ meta_pct_grasa: "150" }))).toEqual(["meta_pct_grasa"]);
      expect(campos(formulario({ meta_pct_grasa: "-1" }))).toEqual(["meta_pct_grasa"]);
      expect(campos(formulario({ meta_pct_grasa: "100" }))).toEqual([]);
    });

    it("peso y cintura tienen que ser mayores que cero", () => {
      expect(campos(formulario({ meta_peso: "0" }))).toEqual(["meta_peso"]);
      expect(campos(formulario({ meta_cintura: "abc" }))).toEqual(["meta_cintura"]);
    });
  });

  describe("horarios", () => {
    it("acepta HH:MM y normaliza los segundos", () => {
      const r = validarConfiguracion(formulario({ horarios: { cena: "21:00:00" } }));
      expect(r.ok && r.configuracion.horarios.cena).toBe("21:00");
    });

    it("los cinco son obligatorios y tienen que ser horas válidas", () => {
      expect(campos(formulario({ horarios: { cena: "" } }))).toEqual(["horarios.cena"]);
      expect(campos(formulario({ horarios: { cena: "25:00" } }))).toEqual(["horarios.cena"]);
      expect(campos(formulario({ horarios: { desayuno: "8:30" } }))).toEqual(["horarios.desayuno"]);
    });
  });

  describe("fechas", () => {
    it("un retorno anterior o igual a la operación no pasa y explica por qué", () => {
      const r = validarConfiguracion(formulario({ fecha_operacion: "2026-09-04", fecha_retorno: "2026-09-01" }));
      expect(!r.ok && r.errores).toEqual([
        {
          campo: "fecha_retorno",
          mensaje: "Fecha de retorno: tiene que ser posterior a la de operación",
          detalle: "tiene que ser posterior a la de operación",
        },
      ]);
      expect(campos(formulario({ fecha_retorno: "2026-09-04" }))).toEqual(["fecha_retorno"]);
    });

    it("las dos pueden ser futuras o quedar vacías", () => {
      expect(campos(formulario({ fecha_retorno: "2027-01-15" }))).toEqual([]);
      expect(campos(formulario({ fecha_operacion: "2027-02-01", fecha_retorno: "2027-06-01" }))).toEqual([]);
      const r = validarConfiguracion(formulario({ fecha_operacion: "", fecha_retorno: "" }));
      expect(r.ok && [r.configuracion.fecha_operacion, r.configuracion.fecha_retorno]).toEqual([null, null]);
    });

    it("rechaza fechas que no existen", () => {
      expect(campos(formulario({ fecha_operacion: "2026-02-30" }))).toEqual(["fecha_operacion"]);
    });
  });

  it("devuelve todos los errores a la vez, no solo el primero", () => {
    expect(
      campos(
        formulario({
          metas_porciones: { aceite: "0,3" },
          meta_agua_ml: "0",
          meta_pct_grasa: "150",
          horarios: { cena: "" },
          fecha_retorno: "2026-01-01",
        }),
      ),
    ).toEqual(["metas_porciones.aceite", "meta_agua_ml", "meta_pct_grasa", "horarios.cena", "fecha_retorno"]);
  });
});

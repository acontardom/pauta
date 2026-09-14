import { describe, expect, it } from "vitest";
import type { Comida, Menu } from "@/lib/supabase/tipos";
import {
  listarMenus,
  obtenerDia,
  registrarAgua,
  registrarComida,
  resumenSemana,
  type ConfigPauta,
  type DiaPauta,
  type FilaComida,
  type Repositorio,
} from "./pauta";

// 2026-09-15 12:00 en Chile: hoy es martes 15 de septiembre.
const AHORA = new Date("2026-09-15T15:00:00Z");
const HOY = "2026-09-15";

const CONFIG: ConfigPauta = {
  metas_porciones: {
    cereales: 4,
    verduras: 3,
    fruta: 2,
    proteicos: 6,
    lacteos: 2,
    aceite: 2,
    grasas: 1,
  },
  meta_agua_ml: 2000,
};

const MENU_DESAYUNO: Menu = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u",
  created_at: "",
  updated_at: "",
  nombre: "Avena con fruta",
  tiempo: "desayuno",
  ingredientes: ["1/2 taza de avena", "1 plátano"],
  observacion: "Con leche descremada",
  porciones: { cereales: 1, fruta: 1, lacteos: 1 },
  kcal: 350,
};

const MENU_ALMUERZO: Menu = {
  ...MENU_DESAYUNO,
  id: "22222222-2222-4222-8222-222222222222",
  nombre: "Pollo con arroz",
  tiempo: "almuerzo",
  ingredientes: ["150 g de pollo", "1 taza de arroz"],
  observacion: null,
  porciones: { cereales: 2, verduras: 1, proteicos: 3, aceite: 1 },
  kcal: 600,
};

/** Repositorio en memoria, con el mismo upsert por (fecha, tiempo) que la base. */
function repoFalso({
  config = CONFIG,
  comidas = [] as Comida[],
  dias = [] as DiaPauta[],
  menus = [MENU_DESAYUNO, MENU_ALMUERZO],
}: {
  config?: ConfigPauta | null;
  comidas?: Comida[];
  dias?: DiaPauta[];
  menus?: Menu[];
} = {}) {
  const estado = { comidas: [...comidas], dias: [...dias] };

  const repo: Repositorio = {
    async configuracion() {
      return config;
    },
    async comidas(desde, hasta) {
      return estado.comidas.filter((c) => c.fecha >= desde && c.fecha <= hasta);
    },
    async dias(desde, hasta) {
      return estado.dias.filter((d) => d.fecha >= desde && d.fecha <= hasta);
    },
    async menus(tiempo) {
      return menus.filter((m) => !tiempo || m.tiempo === tiempo);
    },
    async menu(id) {
      return menus.find((m) => m.id === id) ?? null;
    },
    async guardarComida(fila: FilaComida) {
      estado.comidas = estado.comidas.filter(
        (c) => !(c.fecha === fila.fecha && c.tiempo === fila.tiempo),
      );
      estado.comidas.push(comida(fila));
    },
    async guardarAgua(fecha, aguaMl) {
      const previo = estado.dias.find((d) => d.fecha === fecha);
      estado.dias = estado.dias.filter((d) => d.fecha !== fecha);
      estado.dias.push({ ...(previo ?? dia(fecha)), agua_ml: aguaMl });
    },
  };

  return { repo, estado };
}

function comida(fila: FilaComida): Comida {
  return {
    id: `${fila.fecha}-${fila.tiempo}`,
    user_id: "u",
    created_at: "",
    updated_at: "",
    ...fila,
  };
}

function dia(fecha: string, extra: Partial<DiaPauta> = {}): DiaPauta {
  return {
    fecha,
    agua_ml: 0,
    kcal_activas: null,
    entrenamiento: [],
    entrenamiento_minutos: null,
    estado_tobillo: null,
    cerrado: false,
    ...extra,
  };
}

function texto(r: { ok: boolean; texto?: string; error?: string }): string {
  if (!r.ok) throw new Error(`Se esperaba ok y vino: ${r.error}`);
  return r.texto!;
}

describe("obtener_dia", () => {
  it("un día sin registros vuelve vacío, con todas las metas pendientes y sin error", async () => {
    const { repo } = repoFalso();
    const t = texto(await obtenerDia(repo, {}, AHORA));

    expect(t).toContain(`(${HOY}), hoy · día abierto`);
    expect(t).toContain("Comidas (0 de 5):");
    expect(t).toContain("- Desayuno: pendiente");
    expect(t).toContain("- Cena: pendiente");
    expect(t).toContain("- Cereales: 0 de 4 · faltan 4");
    expect(t).toContain("- Proteicos: 0 de 6 · faltan 6");
    expect(t).toContain("- Grasas: 0 de 1 · faltan 1");
    expect(t).not.toContain("meta cumplida");
    expect(t).toContain("Agua: 0 de 2 L · faltan 2 L");
    expect(t).toContain("Calorías activas (gastadas): sin registro");
    expect(t).toContain("Tobillo: sin registro");
  });

  it("suma las comidas registradas, incluidas las estimadas, y muestra el resto del día", async () => {
    const { repo } = repoFalso({
      comidas: [
        comida({ fecha: HOY, tiempo: "almuerzo", modo: "menu", menu_id: MENU_ALMUERZO.id, nombre_menu: "Pollo con arroz", texto_libre: null, porciones: { cereales: 2, proteicos: 3 }, kcal: 600 }),
        comida({ fecha: HOY, tiempo: "cena", modo: "fuera", menu_id: null, nombre_menu: null, texto_libre: "Sushi", porciones: { cereales: 2 }, kcal: null }),
      ],
      dias: [dia(HOY, { agua_ml: 1250, kcal_activas: 420, entrenamiento: ["Bicicleta"], entrenamiento_minutos: 40, estado_tobillo: "mejor", cerrado: true })],
    });
    const t = texto(await obtenerDia(repo, { fecha: HOY }, AHORA));

    expect(t).toContain("día cerrado");
    expect(t).toContain("Comidas (2 de 5):");
    expect(t).toContain('- Almuerzo: menú "Pollo con arroz" · 2 cereales · 3 proteicos · 600 kcal');
    expect(t).toContain('- Cena: comí fuera, estimada ("Sushi") · 2 cereales');
    expect(t).toContain("- Cereales: 4 de 4 · meta cumplida");
    expect(t).toContain("- Proteicos: 3 de 6 · faltan 3");
    expect(t).toContain("Kcal aportadas por las comidas: ≈600");
    expect(t).toContain("Agua: 1,25 de 2 L · faltan 0,75 L");
    expect(t).toContain("Calorías activas (gastadas): 420 kcal");
    expect(t).toContain("Entrenamiento: Bicicleta · 40 min");
    expect(t).toContain("Tobillo: Mejor");
  });

  it("rechaza fechas futuras o mal escritas", async () => {
    const { repo } = repoFalso();
    expect(await obtenerDia(repo, { fecha: "2026-09-16" }, AHORA)).toMatchObject({ ok: false });
    expect(await obtenerDia(repo, { fecha: "15-09-2026" }, AHORA)).toMatchObject({ ok: false });
  });
});

describe("listar_menus", () => {
  it("lista los menús con id, porciones, kcal, ingredientes y observación", async () => {
    const { repo } = repoFalso();
    const t = texto(await listarMenus(repo, {}));

    expect(t).toContain("2 menús.");
    expect(t).toContain("Desayuno:");
    expect(t).toContain(`- Avena con fruta (id: ${MENU_DESAYUNO.id})`);
    expect(t).toContain("  Porciones: 1 cereales · 1 fruta · 1 lácteos · 350 kcal");
    expect(t).toContain("  Ingredientes: 1/2 taza de avena; 1 plátano");
    expect(t).toContain("  Observación: Con leche descremada");
    expect(t).toContain("Almuerzo:");
  });

  it("filtra por tiempo y rechaza un tiempo desconocido", async () => {
    const { repo } = repoFalso();
    const t = texto(await listarMenus(repo, { tiempo: "almuerzo" }));
    expect(t).toContain("1 menú de almuerzo.");
    expect(t).not.toContain("Avena con fruta");

    expect(await listarMenus(repo, { tiempo: "once" })).toMatchObject({ ok: false });
    expect(texto(await listarMenus(repo, { tiempo: "cena" }))).toBe("No hay menús guardados de cena.");
  });
});

describe("registrar_comida", () => {
  it("con modo menu copia las porciones del menú guardado y las suma al día", async () => {
    const { repo, estado } = repoFalso();
    const t = texto(
      await registrarComida(repo, { tiempo: "almuerzo", modo: "menu", menu_id: MENU_ALMUERZO.id }, AHORA),
    );

    expect(estado.comidas).toHaveLength(1);
    expect(estado.comidas[0]).toMatchObject({
      fecha: HOY,
      tiempo: "almuerzo",
      modo: "menu",
      menu_id: MENU_ALMUERZO.id,
      nombre_menu: "Pollo con arroz",
      texto_libre: null,
      porciones: { cereales: 2, verduras: 1, proteicos: 3, aceite: 1 },
      kcal: 600,
    });
    expect(t).toContain('Registrado en almuerzo del martes 15 de septiembre: menú "Pollo con arroz"');
    expect(t).toContain("Acumulado del día:");
    expect(t).toContain("- Cereales: 2 de 4 · faltan 2");
    expect(t).toContain("- Proteicos: 3 de 6 · faltan 3");
    expect(t).not.toContain("Reemplazó");
  });

  it("devuelve también las kcal y el agua del día, sin tener que llamar a obtener_dia", async () => {
    const { repo } = repoFalso({
      comidas: [
        comida({ fecha: HOY, tiempo: "desayuno", modo: "menu", menu_id: MENU_DESAYUNO.id, nombre_menu: "Avena con fruta", texto_libre: null, porciones: { cereales: 1, fruta: 1, lacteos: 1 }, kcal: 350 }),
      ],
      dias: [dia(HOY, { agua_ml: 1250 })],
    });
    const t = texto(
      await registrarComida(repo, { tiempo: "almuerzo", modo: "menu", menu_id: MENU_ALMUERZO.id }, AHORA),
    );

    // 350 del desayuno más 600 del almuerzo.
    expect(t).toContain("Kcal aportadas por las comidas: ≈950");
    expect(t).toContain("Agua: 1,25 de 2 L · faltan 0,75 L");
    expect(t.indexOf("Acumulado del día:")).toBeLessThan(t.indexOf("Agua:"));
  });

  it("sin kcal ni agua lo dice, en vez de omitirlo", async () => {
    const { repo } = repoFalso();
    const t = texto(
      await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: { proteicos: 3 } }, AHORA),
    );
    expect(t).toContain("Kcal aportadas por las comidas: sin dato");
    expect(t).toContain("Agua: 0 de 2 L · faltan 2 L");
  });

  it("sobre un tiempo ya registrado lo reemplaza e informa qué había", async () => {
    const { repo, estado } = repoFalso({
      comidas: [
        comida({ fecha: HOY, tiempo: "almuerzo", modo: "manual", menu_id: null, nombre_menu: null, texto_libre: null, porciones: { verduras: 2 }, kcal: null }),
      ],
    });
    const t = texto(
      await registrarComida(repo, { tiempo: "almuerzo", modo: "menu", menu_id: MENU_ALMUERZO.id }, AHORA),
    );

    expect(estado.comidas).toHaveLength(1);
    expect(estado.comidas[0].modo).toBe("menu");
    expect(t).toContain("Reemplazó lo que ya había registrado en almuerzo: porciones marcadas · 2 verduras.");
    // El acumulado ya no cuenta lo reemplazado.
    expect(t).toContain("- Verduras: 1 de 3 · faltan 2");
  });

  it("modo manual guarda porciones limpias y exige al menos una", async () => {
    const { repo, estado } = repoFalso();
    texto(
      await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: { proteicos: 3, aceite: 0.5, fruta: 0 } }, AHORA),
    );
    expect(estado.comidas[0]).toMatchObject({ modo: "manual", porciones: { proteicos: 3, aceite: 0.5 }, menu_id: null, texto_libre: null });

    expect(await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: {} }, AHORA)).toMatchObject({ ok: false });
  });

  it("modo fuera usa 'Comí fuera' por defecto y admite porciones vacías", async () => {
    const { repo, estado } = repoFalso();
    const t = texto(await registrarComida(repo, { tiempo: "colacion_pm", modo: "fuera" }, AHORA));
    expect(estado.comidas[0]).toMatchObject({ modo: "fuera", texto_libre: "Comí fuera", porciones: {} });
    expect(t).toContain('comí fuera, estimada ("Comí fuera") · sin porciones');
  });

  it("rechaza con un mensaje claro lo que no calza con el modo, y no escribe nada", async () => {
    const { repo, estado } = repoFalso();
    const casos = [
      { tiempo: "almuerzo", modo: "menu" as const },
      { tiempo: "almuerzo", modo: "menu" as const, menu_id: "33333333-3333-4333-8333-333333333333" },
      { tiempo: "almuerzo", modo: "menu" as const, menu_id: MENU_ALMUERZO.id, porciones: { cereales: 1 } },
      { tiempo: "almuerzo", modo: "manual" as const, porciones: { cereales: 1 }, menu_id: MENU_ALMUERZO.id },
      { tiempo: "once", modo: "manual" as const, porciones: { cereales: 1 } },
      { tiempo: "almuerzo", modo: "manual" as const, porciones: { aceite: 0.3 } },
      { fecha: "2026-09-16", tiempo: "almuerzo", modo: "fuera" as const },
    ];
    for (const caso of casos) {
      expect(await registrarComida(repo, caso, AHORA)).toMatchObject({ ok: false });
    }
    expect(estado.comidas).toHaveLength(0);
  });

  describe("kcal", () => {
    it("en modo manual se guardan las kcal enviadas y suman al acumulado", async () => {
      const { repo, estado } = repoFalso();
      const t = texto(
        await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: { proteicos: 3 }, kcal: 450 }, AHORA),
      );
      expect(estado.comidas[0]).toMatchObject({ modo: "manual", kcal: 450 });
      expect(t).toContain("porciones marcadas · 3 proteicos · 450 kcal");
      expect(t).toContain("Kcal aportadas por las comidas: ≈450");
    });

    it("en modo fuera se guardan aunque no haya porciones", async () => {
      const { repo, estado } = repoFalso();
      const t = texto(
        await registrarComida(repo, { tiempo: "cena", modo: "fuera", texto_libre: "Sushi", kcal: 800 }, AHORA),
      );
      expect(estado.comidas[0]).toMatchObject({ modo: "fuera", porciones: {}, kcal: 800 });
      expect(t).toContain('comí fuera, estimada ("Sushi") · 800 kcal');
    });

    it("sin kcal, manual y fuera quedan en null", async () => {
      const { repo, estado } = repoFalso();
      texto(await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: { proteicos: 3 } }, AHORA));
      texto(await registrarComida(repo, { tiempo: "almuerzo", modo: "fuera" }, AHORA));
      expect(estado.comidas.map((c) => c.kcal)).toEqual([null, null]);
    });

    it("en modo menu se ignoran: se copian las del menú y se avisa", async () => {
      const { repo, estado } = repoFalso();
      const t = texto(
        await registrarComida(repo, { tiempo: "almuerzo", modo: "menu", menu_id: MENU_ALMUERZO.id, kcal: 999 }, AHORA),
      );
      expect(estado.comidas[0].kcal).toBe(600);
      expect(t).toContain('Se ignoraron las 999 kcal enviadas: en modo "menu" se usan las del menú (600 kcal).');
      expect(t).toContain("Kcal aportadas por las comidas: ≈600");
    });

    it("rechaza kcal no enteras o negativas en manual y fuera, sin escribir", async () => {
      const { repo, estado } = repoFalso();
      expect(
        await registrarComida(repo, { tiempo: "cena", modo: "manual", porciones: { proteicos: 3 }, kcal: 450.5 }, AHORA),
      ).toMatchObject({ ok: false });
      expect(
        await registrarComida(repo, { tiempo: "cena", modo: "fuera", kcal: -10 }, AHORA),
      ).toMatchObject({ ok: false });
      expect(estado.comidas).toHaveLength(0);
    });
  });

  it("avisa si el menú es de otro tiempo", async () => {
    const { repo } = repoFalso();
    const t = texto(
      await registrarComida(repo, { tiempo: "cena", modo: "menu", menu_id: MENU_DESAYUNO.id }, AHORA),
    );
    expect(t).toContain("Ojo: es un menú de desayuno, registrado en cena.");
  });
});

describe("registrar_agua", () => {
  it("suma al agua del día y dice cuánto falta para la meta", async () => {
    const { repo, estado } = repoFalso({ dias: [dia(HOY, { agua_ml: 750, cerrado: true })] });
    const t = texto(await registrarAgua(repo, { ml: 500 }, AHORA));

    expect(estado.dias[0]).toMatchObject({ fecha: HOY, agua_ml: 1250, cerrado: true });
    expect(t).toContain("Sumados 500 ml al martes 15 de septiembre.");
    expect(t).toContain("Agua del día: 1,25 de 2 L · faltan 0,75 L");
  });

  it("sin fila del día, crea el día con esa agua", async () => {
    const { repo, estado } = repoFalso();
    const t = texto(await registrarAgua(repo, { fecha: "2026-09-14", ml: 2250 }, AHORA));
    expect(estado.dias).toEqual([dia("2026-09-14", { agua_ml: 2250 })]);
    expect(t).toContain("Agua del día: 2,25 de 2 L · meta cumplida");
  });

  it("rechaza cantidades no válidas y fechas futuras sin escribir", async () => {
    const { repo, estado } = repoFalso();
    for (const entrada of [{ ml: 0 }, { ml: -250 }, { ml: 2.5 }, { ml: 6000 }, { fecha: "2026-09-16", ml: 250 }]) {
      expect(await registrarAgua(repo, entrada, AHORA)).toMatchObject({ ok: false });
    }
    expect(estado.dias).toHaveLength(0);
  });
});

describe("obtener_resumen_semana", () => {
  it("por defecto mira los 7 días que terminan hoy: registrados, metas cumplidas y promedios", async () => {
    const lleno = { cereales: 4, verduras: 3, fruta: 2, proteicos: 6, lacteos: 2, aceite: 2, grasas: 1 };
    const { repo } = repoFalso({
      comidas: [
        comida({ fecha: "2026-09-10", tiempo: "almuerzo", modo: "manual", menu_id: null, nombre_menu: null, texto_libre: null, porciones: lleno, kcal: null }),
        comida({ fecha: "2026-09-12", tiempo: "cena", modo: "fuera", menu_id: null, nombre_menu: null, texto_libre: "Asado", porciones: { proteicos: 6 }, kcal: null }),
      ],
      dias: [
        dia("2026-09-10", { agua_ml: 2000, kcal_activas: 400, cerrado: true }),
        dia("2026-09-12", { agua_ml: 1500, cerrado: true }),
        dia("2026-09-13", { kcal_activas: 200 }),
      ],
    });
    const t = texto(await resumenSemana(repo, {}, AHORA));

    expect(t).toContain("Semana del 9 de septiembre al 15 de septiembre");
    expect(t).toContain("Días registrados (cerrados): 2/7");
    expect(t).toContain("(2026-09-09) · abierto · sin comidas registradas · agua sin registro");
    expect(t).toContain(
      "(2026-09-10) · registrado · 1 de 5 comidas · cumplidas 7: cereales, verduras, fruta, proteicos, lácteos, aceite, grasas · agua 2 L",
    );
    expect(t).toContain(
      "(2026-09-12) · registrado · 1 de 5 comidas (con comida estimada) · cumplidas 1: proteicos · agua 1,5 L",
    );
    // Un día con fila pero sin agua no cuenta como dato de agua.
    expect(t).toContain("(2026-09-13) · abierto · sin comidas registradas · agua sin registro");
    // Agua sobre los días con dato (2000 y 1500); kcal activas sobre 400 y 200.
    expect(t).toContain(
      "Promedio de agua: 1,75 L (sobre 2 días con dato) · calorías activas: 300 kcal (sobre 2 días con dato)",
    );
  });

  it("acepta una fecha de inicio y marca los días que todavía no llegan", async () => {
    const { repo } = repoFalso();
    const t = texto(await resumenSemana(repo, { fecha_inicio: "2026-09-13" }, AHORA));
    expect(t).toContain("Semana del 13 de septiembre al 19 de septiembre");
    expect(t).toContain("(2026-09-16) · abierto · todavía no llega");
    expect(t).toContain(
      "Promedio de agua: — (ningún día con dato) · calorías activas: — (ningún día con dato)",
    );
  });

  it("con un solo día con dato lo dice en singular", async () => {
    const { repo } = repoFalso({ dias: [dia("2026-09-14", { agua_ml: 750, kcal_activas: 150 })] });
    const t = texto(await resumenSemana(repo, {}, AHORA));
    expect(t).toContain("(2026-09-14) · abierto · sin comidas registradas · agua 0,75 L");
    expect(t).toContain(
      "Promedio de agua: 0,75 L (sobre 1 día con dato) · calorías activas: 150 kcal (sobre 1 día con dato)",
    );
  });

  it("el promedio de agua cuadra con los días que declara, con dos decimales", async () => {
    // 1,5 + 0,25 + 1 = 2,75 L en 3 días = 0,9167 L. Redondeado a 50 ml daría
    // 0,90, que no cuadra con los días mostrados; con dos decimales es 0,92.
    const { repo } = repoFalso({
      dias: [
        dia("2026-09-11", { agua_ml: 1500 }),
        dia("2026-09-12", { agua_ml: 250 }),
        dia("2026-09-13", { agua_ml: 0, kcal_activas: 300 }),
        dia("2026-09-14", { agua_ml: 1000 }),
      ],
    });
    const t = texto(await resumenSemana(repo, {}, AHORA));

    expect(t).toContain("(2026-09-11) · abierto · sin comidas registradas · agua 1,5 L");
    expect(t).toContain("(2026-09-12) · abierto · sin comidas registradas · agua 0,25 L");
    expect(t).toContain("(2026-09-13) · abierto · sin comidas registradas · agua sin registro");
    expect(t).toContain("(2026-09-14) · abierto · sin comidas registradas · agua 1 L");
    expect(t).toContain("Promedio de agua: 0,92 L (sobre 3 días con dato)");
    expect(t).not.toContain("0,90 L");

    expect(await resumenSemana(repo, { fecha_inicio: "2026-09-20" }, AHORA)).toMatchObject({ ok: false });
  });
});

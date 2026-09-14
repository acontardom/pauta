import { describe, expect, it } from "vitest";
import { LARGO_MINIMO_TOKEN, revisarToken, type EncabezadosToken } from "./token";

const TOKEN = "t".repeat(LARGO_MINIMO_TOKEN) + "-secreto";

function encabezados(extra: Partial<EncabezadosToken> = {}): EncabezadosToken {
  return { accessKey: null, autorizacion: null, ...extra };
}

describe("revisarToken", () => {
  describe("access-key", () => {
    it("acepta el token plano correcto", () => {
      expect(revisarToken(encabezados({ accessKey: TOKEN }), TOKEN)).toBe("valido");
      expect(revisarToken(encabezados({ accessKey: `  ${TOKEN} ` }), TOKEN)).toBe("valido");
    });

    it("rechaza un token incorrecto", () => {
      expect(revisarToken(encabezados({ accessKey: "otro-token" }), TOKEN)).toBe("invalido");
      expect(revisarToken(encabezados({ accessKey: `${TOKEN}x` }), TOKEN)).toBe("invalido");
    });

    it("no acepta el prefijo Bearer: el token va plano", () => {
      expect(revisarToken(encabezados({ accessKey: `Bearer ${TOKEN}` }), TOKEN)).toBe("invalido");
    });

    it("vacío cuenta como ausente", () => {
      expect(revisarToken(encabezados({ accessKey: "   " }), TOKEN)).toBe("ausente");
    });

    it("decide sobre Authorization, que puede traer el token de OAuth de Claude", () => {
      expect(
        revisarToken(encabezados({ accessKey: TOKEN, autorizacion: "Bearer token-de-oauth" }), TOKEN),
      ).toBe("valido");
      expect(
        revisarToken(encabezados({ accessKey: "otro-token", autorizacion: `Bearer ${TOKEN}` }), TOKEN),
      ).toBe("invalido");
    });
  });

  describe("Authorization: Bearer, como alternativa", () => {
    it("acepta el token correcto", () => {
      expect(revisarToken(encabezados({ autorizacion: `Bearer ${TOKEN}` }), TOKEN)).toBe("valido");
      expect(revisarToken(encabezados({ autorizacion: `bearer ${TOKEN}` }), TOKEN)).toBe("valido");
    });

    it("rechaza un token incorrecto o con otro esquema", () => {
      expect(revisarToken(encabezados({ autorizacion: "Bearer otro-token" }), TOKEN)).toBe("invalido");
      expect(revisarToken(encabezados({ autorizacion: `Basic ${TOKEN}` }), TOKEN)).toBe("invalido");
      expect(revisarToken(encabezados({ autorizacion: TOKEN }), TOKEN)).toBe("invalido");
    });
  });

  it("sin ninguno de los dos encabezados, falta el token", () => {
    expect(revisarToken(encabezados(), TOKEN)).toBe("ausente");
    expect(revisarToken(encabezados({ autorizacion: "" }), TOKEN)).toBe("ausente");
  });

  it("sin MCP_TOKEN, o con uno demasiado corto, no acepta nada", () => {
    expect(revisarToken(encabezados({ accessKey: TOKEN }), undefined)).toBe("sin-configurar");
    expect(revisarToken(encabezados({ autorizacion: `Bearer ${TOKEN}` }), undefined)).toBe("sin-configurar");
    expect(revisarToken(encabezados({ accessKey: "corto" }), "corto")).toBe("sin-configurar");
  });
});

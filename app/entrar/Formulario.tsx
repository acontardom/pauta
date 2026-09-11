"use client";

import { useEffect, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import Tarjeta from "@/components/ui/Tarjeta";
import { enviarCodigo, verificarCodigo } from "./acciones";

const SEGUNDOS_REENVIO = 60;

export default function Formulario({
  mensajeInicial,
}: {
  mensajeInicial?: string;
}) {
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState(mensajeInicial ?? "");
  const [espera, setEspera] = useState(0);
  const [pendiente, iniciar] = useTransition();

  // Cuenta regresiva del botón de reenvío.
  useEffect(() => {
    if (espera <= 0) return;
    const id = window.setInterval(() => {
      setEspera((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [espera]);

  function pedirCodigo() {
    setMensaje("");
    iniciar(async () => {
      const r = await enviarCodigo(correo);
      if (r.ok) {
        setPaso("codigo");
        setCodigo("");
        setEspera(SEGUNDOS_REENVIO);
      } else {
        setMensaje(r.error);
      }
    });
  }

  function entrar() {
    setMensaje("");
    iniciar(async () => {
      // Si el código es correcto la acción redirige y esto no vuelve.
      const r = await verificarCodigo(correo, codigo);
      if (r && !r.ok) setMensaje(r.error);
    });
  }

  const correoListo = correo.includes("@") && correo.trim().length > 3;
  const codigoListo = codigo.length >= 6 && codigo.length <= 10;

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 pb-20 pt-[env(safe-area-inset-top)]">
      <h1 className="mb-1 text-center font-serif text-[34px] font-medium text-tinta">
        Pauta
      </h1>
      <p className="mb-7 text-center text-[13.5px] text-tinta-3">
        {paso === "correo"
          ? "Entra con tu correo"
          : "Escribe el código que te llegó"}
      </p>

      <Tarjeta>
        {paso === "correo" ? (
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="correo"
                className="block text-[12.5px] text-tinta-3"
              >
                Correo
              </label>
              <input
                id="correo"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                inputMode="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && correoListo) pedirCodigo();
                }}
                placeholder="tucorreo@ejemplo.cl"
                /* 16px como mínimo: bajo eso, iOS hace zoom al enfocar. */
                className="mt-1.5 h-[54px] w-full rounded-control border border-borde bg-superficie px-[14px] text-[16px] text-tinta placeholder:text-tinta-5 focus:border-verde-borde focus:outline-none"
              />
            </div>
            <Boton onClick={pedirCodigo} disabled={!correoListo || pendiente}>
              {pendiente ? "Enviando…" : "Enviar código"}
            </Boton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] leading-relaxed text-tinta-2">
              Te enviamos un código a{" "}
              <span className="text-tinta">{correo.trim().toLowerCase()}</span>
            </p>
            <CampoNumerico
              etiqueta="Código"
              valor={codigo}
              onChange={setCodigo}
              modo="entero"
              placeholder="000000"
              autoComplete="one-time-code"
            />
            <Boton onClick={entrar} disabled={!codigoListo || pendiente}>
              {pendiente ? "Entrando…" : "Entrar"}
            </Boton>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={pedirCodigo}
                disabled={espera > 0 || pendiente}
                className="py-1.5 text-[13px] text-verde disabled:text-tinta-5"
              >
                {espera > 0 ? `Reenviar código (${espera})` : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaso("correo");
                  setCodigo("");
                  setMensaje("");
                  setEspera(0);
                }}
                className="py-1.5 text-[13px] text-tinta-3"
              >
                Cambiar correo
              </button>
            </div>
          </div>
        )}
      </Tarjeta>

      {/* Errores en tono neutro: nada en rojo. */}
      {mensaje ? (
        <p
          role="status"
          className="mt-4 text-center text-[13.5px] leading-relaxed text-tinta-2"
        >
          {mensaje}
        </p>
      ) : null}

      <p className="mt-6 text-center text-[12px] leading-relaxed text-tinta-4">
        En la app instalada usa el código. El enlace del correo sirve cuando
        entras desde el navegador.
      </p>
    </div>
  );
}

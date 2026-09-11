"use client";

import { useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import Tarjeta from "@/components/ui/Tarjeta";
import { iniciarSesion } from "./acciones";

/* Campos de texto propios del login. El resto de la app usa CampoNumerico. */
const CLASE_CAMPO =
  // 16px como mínimo: bajo eso, iOS hace zoom al enfocar.
  "mt-1.5 h-[54px] w-full rounded-control border border-borde bg-superficie px-[14px] text-[16px] text-tinta placeholder:text-tinta-5 focus:border-verde-borde focus:outline-none";

export default function Formulario() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pendiente, iniciar] = useTransition();

  const listo = correo.includes("@") && password.length > 0;

  function entrar() {
    if (!listo) return;
    setMensaje("");
    iniciar(async () => {
      // Si las credenciales están bien, la acción redirige y esto no vuelve.
      const r = await iniciarSesion(correo, password);
      if (r && !r.ok) setMensaje(r.error);
    });
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 pb-20 pt-[env(safe-area-inset-top)]">
      <h1 className="mb-1 text-center font-serif text-[34px] font-medium text-tinta">
        Pauta
      </h1>
      <p className="mb-7 text-center text-[13.5px] text-tinta-3">
        Entra con tu correo
      </p>

      <Tarjeta>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="correo" className="block text-[12.5px] text-tinta-3">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              enterKeyHint="next"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.cl"
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[12.5px] text-tinta-3"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") entrar();
              }}
              placeholder="••••••••"
              className={CLASE_CAMPO}
            />
          </div>

          <Boton onClick={entrar} disabled={!listo || pendiente}>
            {pendiente ? "Entrando…" : "Entrar"}
          </Boton>
        </div>
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
    </div>
  );
}

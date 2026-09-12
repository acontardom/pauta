"use client";

import { useId, useRef } from "react";

type Props = {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  modo?: "entero" | "decimal";
  placeholder?: string;
  sufijo?: string;
  /** Para casos como el código de un solo uso ("one-time-code"). */
  autoComplete?: string;
  /**
   * "grande" para los campos protagonistas de una hoja (peso, cintura).
   * "compacto" para formularios de varias columnas (InBody).
   */
  tamano?: "normal" | "grande" | "compacto";
  className?: string;
};

const ESTILO_TAMANO = {
  normal: "h-[54px] bg-superficie px-[14px] text-[19px]",
  grande: "h-[60px] bg-superficie px-[14px] text-[26px]",
  compacto: "h-[50px] bg-fondo px-[11px] text-[19px]",
} as const;

/*
  Campo numérico único de la app.

  Dos decisiones deliberadas:
  - type="text" con inputMode, nunca type="number": en iOS el teclado chileno
    escribe coma decimal y type="number" la descarta.
  - font-size de 16px como mínimo: por debajo de eso iOS hace zoom al enfocar.
*/
export default function CampoNumerico({
  etiqueta,
  valor,
  onChange,
  modo = "decimal",
  placeholder = "—",
  sufijo,
  autoComplete = "off",
  tamano = "normal",
  className = "",
}: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  const permitido = modo === "entero" ? /[^\d]/g : /[^\d.,]/g;

  function manejarCambio(texto: string) {
    let limpio = texto.replace(permitido, "");
    if (modo === "decimal") {
      // Se conserva solo el primer separador decimal.
      const primero = limpio.search(/[.,]/);
      if (primero !== -1) {
        limpio =
          limpio.slice(0, primero + 1) +
          limpio.slice(primero + 1).replace(/[.,]/g, "");
      }
    }
    onChange(limpio);
  }

  /*
    Con el teclado de iOS abierto el campo puede quedar tapado. Se lo centra
    en su contenedor con scroll después de que el teclado terminó de subir.
  */
  function alEnfocar() {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-tinta-3 ${
          tamano === "compacto" ? "text-[11.5px] leading-snug" : "text-[12.5px]"
        }`}
      >
        {etiqueta}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          ref={ref}
          type="text"
          inputMode={modo === "entero" ? "numeric" : "decimal"}
          enterKeyHint="done"
          autoComplete={autoComplete}
          value={valor}
          placeholder={placeholder}
          onFocus={alEnfocar}
          onChange={(e) => manejarCambio(e.target.value)}
          className={`w-full rounded-control border border-borde font-serif text-tinta placeholder:text-tinta-5 focus:border-verde-borde focus:outline-none ${
            ESTILO_TAMANO[tamano]
          } ${sufijo ? "pr-12" : ""}`}
        />
        {sufijo ? (
          <span className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-[14px] text-tinta-4">
            {sufijo}
          </span>
        ) : null}
      </div>
    </div>
  );
}

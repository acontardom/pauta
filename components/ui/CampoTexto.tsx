"use client";

import { useId, useRef } from "react";

type Props = {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  variante?: "linea" | "area";
  maxLength?: number;
  /**
   * La etiqueta sigue existiendo para los lectores de pantalla, pero no se ve.
   * Para filas donde el placeholder y el contexto ya dicen qué va (la de
   * preguntas en Recuperación).
   */
  etiquetaOculta?: boolean;
  className?: string;
};

/*
  Campo de texto de la app. Para números va CampoNumerico.

  El font-size de 16px no es estético: por debajo de eso iOS hace zoom al
  enfocar y descoloca la pantalla.
*/
export default function CampoTexto({
  etiqueta,
  valor,
  onChange,
  placeholder,
  variante = "linea",
  maxLength,
  etiquetaOculta = false,
  className = "",
}: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Con el teclado de iOS arriba el campo puede quedar tapado: se centra en
  // su contenedor con scroll una vez que el teclado terminó de subir.
  function alEnfocar() {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }

  const comun = `${
    etiquetaOculta ? "" : "mt-1.5"
  } w-full rounded-control border border-borde bg-superficie px-[14px] text-[16px] text-tinta placeholder:text-tinta-5 focus:border-verde-borde focus:outline-none`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          etiquetaOculta ? "sr-only" : "block text-[12.5px] text-tinta-3"
        }
      >
        {etiqueta}
      </label>
      {variante === "area" ? (
        <textarea
          id={id}
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={valor}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          onFocus={alEnfocar}
          onChange={(e) => onChange(e.target.value)}
          className={`${comun} resize-none py-3 leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          value={valor}
          placeholder={placeholder}
          maxLength={maxLength}
          enterKeyHint="done"
          onFocus={alEnfocar}
          onChange={(e) => onChange(e.target.value)}
          className={`${comun} h-[56px]`}
        />
      )}
    </div>
  );
}

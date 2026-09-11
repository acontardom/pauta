"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
  variante?: "primaria" | "secundaria";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Boton({
  children,
  variante = "primaria",
  className = "",
  type = "button",
  disabled,
  ...resto
}: Props) {
  const base =
    "w-full h-[54px] rounded-tarjeta border text-[16px] font-medium transition-transform active:scale-[0.99] disabled:active:scale-100";
  const estilo =
    variante === "primaria"
      ? "border-verde bg-verde text-white"
      : "border-borde bg-fondo text-tinta-2";
  const apagado = "disabled:border-borde disabled:bg-fondo disabled:text-tinta-6";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${estilo} ${apagado} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Superficie blanca con borde suave. La caja base de casi todas las pantallas. */
export default function Tarjeta({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-tarjeta border border-linea bg-superficie p-[15px] ${className}`}
    >
      {children}
    </div>
  );
}

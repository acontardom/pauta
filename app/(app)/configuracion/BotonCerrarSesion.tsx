"use client";

import { useFormStatus } from "react-dom";
import Boton from "@/components/ui/Boton";

/* Vive aparte porque useFormStatus necesita estar dentro del <form>, en cliente. */
export default function BotonCerrarSesion() {
  const { pending } = useFormStatus();

  return (
    <Boton type="submit" variante="secundaria" disabled={pending}>
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </Boton>
  );
}

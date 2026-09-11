import type { Metadata } from "next";
import Formulario from "./Formulario";

export const metadata: Metadata = { title: "Entrar · Pauta" };

/* Vive fuera del grupo (app): no tiene barra inferior ni engranaje. */
export default function Entrar() {
  return <Formulario />;
}

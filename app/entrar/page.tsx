import type { Metadata } from "next";
import Formulario from "./Formulario";

export const metadata: Metadata = { title: "Entrar · Pauta" };

/*
  Pantalla de entrada. Vive fuera del grupo (app), así que no tiene barra
  inferior ni engranaje.

  El mensaje llega por query string desde /auth/confirmar cuando el enlace
  del correo ya no sirve.
*/
export default async function Entrar({
  searchParams,
}: PageProps<"/entrar">) {
  const { mensaje } = await searchParams;
  const texto = typeof mensaje === "string" ? mensaje : undefined;

  return <Formulario mensajeInicial={texto} />;
}

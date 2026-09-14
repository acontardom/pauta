import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <h1 className="font-serif text-[27px] font-medium text-tinta">
        Esta pantalla no existe
      </h1>
      <p className="mt-4 text-[14.5px] leading-relaxed text-tinta-2">
        Puede que el enlace esté incompleto o haya cambiado.
      </p>
      <Link href="/hoy" className="mt-2 inline-block text-[14px] text-verde">
        Ir a Hoy
      </Link>
    </main>
  );
}

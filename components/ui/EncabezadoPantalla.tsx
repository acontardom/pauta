type Props = {
  titulo: string;
  subtitulo?: string;
};

/** Encabezado simple: lo usan Hoy y Semana cuando falta la configuración. */
export default function EncabezadoPantalla({ titulo, subtitulo }: Props) {
  return (
    <header className="border-b border-linea px-5 pb-[14px] pt-[calc(env(safe-area-inset-top)+22px)]">
      <h1 className="font-serif text-[20px] font-medium tracking-[-0.01em] text-tinta">
        {titulo}
      </h1>
      {subtitulo ? (
        <p className="mt-0.5 text-[12.5px] text-tinta-3">{subtitulo}</p>
      ) : null}
    </header>
  );
}

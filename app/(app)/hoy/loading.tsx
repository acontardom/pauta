import Esqueleto, { Bloque, TarjetaEsqueleto } from "@/components/ui/Esqueleto";

export default function CargandoHoy() {
  return (
    <Esqueleto>
      <div className="border-b border-linea px-5 pb-[14px] pt-[calc(env(safe-area-inset-top)+22px)]">
        <div className="flex items-center gap-1.5">
          <Bloque className="h-10 w-10 shrink-0 rounded-control" />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Bloque className="h-5 w-40 max-w-full rounded-control" />
            <Bloque className="h-3 w-28 max-w-full rounded-control" />
          </div>
          <Bloque className="h-10 w-10 shrink-0 rounded-control" />
          <Bloque className="ml-1 h-[38px] w-[38px] shrink-0 rounded-control" />
        </div>
        <Bloque className="mt-3 h-6 w-28 rounded-full" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <TarjetaEsqueleto key={i} className="h-[62px] w-[72px] shrink-0" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pt-4">
        {Array.from({ length: 5 }, (_, i) => (
          <TarjetaEsqueleto key={i} className="h-[88px]">
            <Bloque className="h-5 w-28 rounded-control" />
            <Bloque className="mt-3 h-3 w-20 rounded-control" />
          </TarjetaEsqueleto>
        ))}
      </div>
    </Esqueleto>
  );
}

import Esqueleto, { Bloque, TarjetaEsqueleto } from "@/components/ui/Esqueleto";

export default function CargandoMenus() {
  return (
    <Esqueleto className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <div className="flex items-center justify-between">
        <Bloque className="h-7 w-24 rounded-control" />
        <Bloque className="h-[38px] w-[76px] rounded-full" />
      </div>

      <div className="mt-4 flex gap-1.5 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Bloque key={i} className="h-[42px] w-20 shrink-0 rounded-full" />
        ))}
      </div>

      <Bloque className="mt-[18px] h-3.5 w-24 rounded-control" />
      <div className="mt-3 flex flex-col gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <TarjetaEsqueleto key={i} className="h-[132px]">
            <Bloque className="h-5 w-40 max-w-full rounded-control" />
            <Bloque className="mt-3 h-3 w-32 max-w-full rounded-control" />
            <Bloque className="mt-2 h-3 w-28 max-w-full rounded-control" />
          </TarjetaEsqueleto>
        ))}
      </div>
    </Esqueleto>
  );
}

import Esqueleto, { Bloque, TarjetaEsqueleto } from "@/components/ui/Esqueleto";

export default function CargandoSemana() {
  return (
    <Esqueleto className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <Bloque className="h-3.5 w-36 rounded-control" />
      <Bloque className="mt-2.5 h-14 w-24 rounded-control" />
      <Bloque className="mt-3 h-4 w-60 max-w-full rounded-control" />

      <TarjetaEsqueleto className="mt-[26px] h-[252px]" />

      <div className="mt-3 flex gap-2.5">
        <TarjetaEsqueleto className="h-[86px] flex-1" />
        <TarjetaEsqueleto className="h-[86px] flex-1" />
      </div>

      <Bloque className="mb-2.5 mt-[26px] h-3.5 w-28 rounded-control" />
      <TarjetaEsqueleto className="h-[84px]" />
    </Esqueleto>
  );
}

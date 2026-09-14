import Esqueleto, { Bloque, TarjetaEsqueleto } from "@/components/ui/Esqueleto";

export default function CargandoRecuperacion() {
  return (
    <Esqueleto className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <Bloque className="h-7 w-44 rounded-control" />
      <Bloque className="mt-2 h-3.5 w-56 max-w-full rounded-control" />

      <TarjetaEsqueleto className="mt-3.5 h-[168px]">
        <Bloque className="h-6 w-36 rounded-control" />
        <Bloque className="mt-5 h-2.5 rounded-[5px]" />
      </TarjetaEsqueleto>
      <Bloque className="mt-3 h-[54px] rounded-tarjeta" />

      {Array.from({ length: 2 }, (_, i) => (
        <TarjetaEsqueleto key={i} className="mt-3 h-[150px]">
          <Bloque className="h-3.5 w-28 rounded-control" />
        </TarjetaEsqueleto>
      ))}
    </Esqueleto>
  );
}

import Esqueleto, { Bloque, TarjetaEsqueleto } from "@/components/ui/Esqueleto";

export default function CargandoProgreso() {
  return (
    <Esqueleto className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <Bloque className="h-7 w-32 rounded-control" />
      <Bloque className="mt-3 h-[74px] rounded-tarjeta" />
      <Bloque className="mt-3.5 h-[54px] rounded-tarjeta" />

      {Array.from({ length: 3 }, (_, i) => (
        <TarjetaEsqueleto key={i} className="mt-3 h-[150px]">
          <Bloque className="h-3.5 w-24 rounded-control" />
        </TarjetaEsqueleto>
      ))}
    </Esqueleto>
  );
}

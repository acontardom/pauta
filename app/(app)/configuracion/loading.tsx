import Esqueleto, { Bloque } from "@/components/ui/Esqueleto";

export default function CargandoConfiguracion() {
  return (
    <Esqueleto className="px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)]">
      <div className="flex items-center gap-2.5">
        <Bloque className="h-10 w-10 shrink-0 rounded-control" />
        <Bloque className="h-7 w-44 rounded-control" />
      </div>
      <Bloque className="mt-2.5 h-3.5 w-60 max-w-full rounded-control" />

      <Bloque className="mt-[26px] h-3.5 w-48 rounded-control" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <Bloque className="h-3 w-16 rounded-control" />
            <Bloque className="mt-1.5 h-[52px] rounded-control" />
          </div>
        ))}
      </div>
    </Esqueleto>
  );
}

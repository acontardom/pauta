"use client";

import { useState } from "react";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import Chip from "@/components/ui/Chip";
import EncabezadoPantalla from "@/components/ui/EncabezadoPantalla";
import HojaInferior from "@/components/ui/HojaInferior";
import Segmentos from "@/components/ui/Segmentos";
import Tarjeta from "@/components/ui/Tarjeta";
import { formatear, parsear } from "@/lib/numeros";

/*
  Página temporal para revisar los componentes compartidos en sus estados.
  Se elimina en la tarea 11.
*/
export default function Componentes() {
  const [chips, setChips] = useState<Record<string, boolean>>({
    fuerza: true,
    bici: false,
    kine: false,
  });
  const [modo, setModo] = useState<"menu" | "porciones" | "fuera">("porciones");
  const [entero, setEntero] = useState("3");
  const [decimal, setDecimal] = useState("1,5");
  const [peso, setPeso] = useState("");
  const [hojaUno, setHojaUno] = useState(false);
  const [hojaDos, setHojaDos] = useState(false);

  return (
    <>
      <EncabezadoPantalla
        titulo="Componentes"
        subtitulo="Página temporal · se elimina en la tarea 11"
      />

      <div className="flex flex-col gap-6 px-5 pb-16 pt-5">
        <Seccion titulo="Tarjeta">
          <Tarjeta>
            <div className="font-serif text-[19px] font-medium">Almuerzo</div>
            <p className="mt-2 text-[14.5px] text-tinta-cuerpo">
              Superficie blanca, borde línea, radio 14.
            </p>
            <p className="mt-2 font-mono text-[11.5px] text-tinta-3">
              Cer 1 · Ver 2 · Pro 4 · Ace 0,5
            </p>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="Boton">
          <div className="flex flex-col gap-2.5">
            <Boton>Guardar comida</Boton>
            <Boton variante="secundaria">Volver a hoy</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
        </Seccion>

        <Seccion titulo="Chip">
          <div className="flex flex-wrap gap-2">
            {[
              { k: "fuerza", l: "Fuerza" },
              { k: "bici", l: "Bicicleta" },
              { k: "kine", l: "Kinesiología" },
            ].map((c) => (
              <Chip
                key={c.k}
                etiqueta={c.l}
                encendido={chips[c.k]}
                onToggle={() =>
                  setChips((p) => ({ ...p, [c.k]: !p[c.k] }))
                }
              />
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Segmentos">
          <Segmentos
            valor={modo}
            onChange={setModo}
            opciones={[
              { valor: "menu", etiqueta: "Elegir menú" },
              { valor: "porciones", etiqueta: "Marcar porciones" },
              { valor: "fuera", etiqueta: "Comí fuera" },
            ]}
          />
          <p className="mt-2 text-[12.5px] text-tinta-3">
            Seleccionado: {modo}
          </p>
        </Seccion>

        <Seccion titulo="CampoNumerico">
          <div className="flex flex-col gap-3">
            <CampoNumerico
              etiqueta="Porciones (entero)"
              valor={entero}
              onChange={setEntero}
              modo="entero"
            />
            <CampoNumerico
              etiqueta="Aceite (decimal)"
              valor={decimal}
              onChange={setDecimal}
              modo="decimal"
            />
            <CampoNumerico
              etiqueta="Peso"
              valor={peso}
              onChange={setPeso}
              modo="decimal"
              sufijo="kg"
            />
            <p className="font-mono text-[11.5px] text-tinta-3">
              parsear(&quot;{decimal}&quot;) = {String(parsear(decimal))} ·
              formatear = {formatear(parsear(decimal))}
            </p>
          </div>
        </Seccion>

        <Seccion titulo="HojaInferior">
          <Boton onClick={() => setHojaUno(true)}>Abrir hoja</Boton>
        </Seccion>
      </div>

      <HojaInferior
        abierta={hojaUno}
        onCerrar={() => setHojaUno(false)}
        titulo="Almuerzo"
        subtitulo="Primera hoja"
        pie={<Boton onClick={() => setHojaUno(false)}>Guardar comida</Boton>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[14.5px] text-tinta-cuerpo">
            Se cierra tocando el fondo o con Escape.
          </p>
          <CampoNumerico
            etiqueta="Aceite (decimal)"
            valor={decimal}
            onChange={setDecimal}
            modo="decimal"
          />
          {/* Espacio para probar el scroll interno y el teclado de iOS. */}
          <div className="h-[420px] rounded-tarjeta border border-dashed border-borde" />
          <CampoNumerico
            etiqueta="Campo al final de la hoja"
            valor={peso}
            onChange={setPeso}
            modo="decimal"
            sufijo="kg"
          />
          <Boton variante="secundaria" onClick={() => setHojaDos(true)}>
            Abrir una segunda hoja encima
          </Boton>
        </div>
      </HojaInferior>

      <HojaInferior
        abierta={hojaDos}
        onCerrar={() => setHojaDos(false)}
        titulo="Segunda hoja"
        subtitulo="Abierta sobre la primera"
      >
        <p className="text-[14.5px] text-tinta-cuerpo">
          Escape cierra solo esta; la de abajo sigue abierta.
        </p>
      </HojaInferior>
    </>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2.5 text-[10.5px] uppercase tracking-[0.06em] text-tinta-3">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

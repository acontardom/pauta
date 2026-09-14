"use client";

import { useId, useState, useTransition } from "react";
import Boton from "@/components/ui/Boton";
import CampoNumerico from "@/components/ui/CampoNumerico";
import CampoTexto from "@/components/ui/CampoTexto";
import Chip from "@/components/ui/Chip";
import HojaInferior from "@/components/ui/HojaInferior";
import { AUTORIZACIONES } from "@/lib/dominio";
import { siguienteSesion } from "@/lib/recuperacion";
import { llamarAccion } from "@/lib/red";
import type {
  EntradaRecuperacion,
  Hinchazon,
  TipoEntrada,
} from "@/lib/supabase/tipos";
import type { EntradaFormulario } from "@/lib/validarEntrada";
import { actualizarEntrada, eliminarEntrada, guardarEntrada } from "./acciones";

type Props = {
  /** El registro a editar, o null para crear uno nuevo. */
  entrada: EntradaRecuperacion | null;
  /** Todas las entradas, para sugerir el número de la próxima sesión. */
  entradas: EntradaRecuperacion[];
  hoy: string;
  onCerrar: () => void;
};

const TIPOS: { valor: TipoEntrada; etiqueta: string }[] = [
  { valor: "kine", etiqueta: "Kinesiología" },
  { valor: "control", etiqueta: "Control médico" },
  { valor: "nota", etiqueta: "Nota" },
];

const HINCHAZONES: { valor: Hinchazon; etiqueta: string }[] = [
  { valor: "menos", etiqueta: "Menos" },
  { valor: "igual", etiqueta: "Igual" },
  { valor: "mas", etiqueta: "Más" },
];

const OTRO = "Otro";
const PREDEFINIDAS = new Set<string>(AUTORIZACIONES.filter((a) => a !== OTRO));

const CLASE_FECHA =
  "mt-1.5 h-[54px] w-full rounded-control border border-borde bg-superficie px-[14px] font-serif text-[19px] text-tinta focus:border-verde-borde focus:outline-none";

function Etiqueta({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return htmlFor ? (
    <label htmlFor={htmlFor} className="block text-[12.5px] text-tinta-3">
      {children}
    </label>
  ) : (
    <span className="block text-[12.5px] text-tinta-3">{children}</span>
  );
}

type ValoresEntrada = {
  tipo: TipoEntrada;
  fecha: string;
  numero: string;
  marcadas: Set<string>;
  otro: string;
  hinchazon: Hinchazon | null;
  indicaciones: string;
  proximo: string;
  nota: string;
};

/** Lo que muestra el formulario al abrirse: contra esto se miden los cambios. */
function valoresIniciales(entrada: EntradaRecuperacion | null, hoy: string): ValoresEntrada {
  // Lo autorizado que no está en la lista vuelve como "Otro" con su texto.
  const guardadas = entrada?.autorizado ?? [];
  const personalizadas = guardadas.filter((a) => !PREDEFINIDAS.has(a));
  const marcadas = new Set(guardadas.filter((a) => PREDEFINIDAS.has(a)));
  if (personalizadas.length > 0) marcadas.add(OTRO);

  return {
    // Un registro nuevo abre como kinesiología, el tipo más frecuente.
    tipo: entrada?.tipo ?? "kine",
    fecha: entrada?.fecha ?? hoy,
    numero: entrada?.numero_sesion != null ? String(entrada.numero_sesion) : "",
    marcadas,
    otro: personalizadas.join(", "),
    hinchazon: entrada?.hinchazon ?? null,
    indicaciones: entrada?.indicaciones ?? "",
    proximo: entrada?.proximo_control ?? "",
    nota: entrada?.nota ?? "",
  };
}

function mismosElementos(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

export default function HojaEntrada({
  entrada,
  entradas,
  hoy,
  onCerrar,
}: Props) {
  const editando = entrada !== null;
  const idFecha = useId();
  const idProximo = useId();

  const [inicial] = useState(() => valoresIniciales(entrada, hoy));

  const [tipo, setTipo] = useState<TipoEntrada>(inicial.tipo);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [numero, setNumero] = useState(inicial.numero);
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(inicial.marcadas));
  const [otro, setOtro] = useState(inicial.otro);
  const [hinchazon, setHinchazon] = useState<Hinchazon | null>(inicial.hinchazon);
  const [indicaciones, setIndicaciones] = useState(inicial.indicaciones);
  const [proximo, setProximo] = useState(inicial.proximo);
  const [nota, setNota] = useState(inicial.nota);

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciarGuardado] = useTransition();
  const [eliminando, iniciarEliminado] = useTransition();
  const ocupada = guardando || eliminando;

  const hayCambios =
    tipo !== inicial.tipo ||
    fecha !== inicial.fecha ||
    numero !== inicial.numero ||
    !mismosElementos(marcadas, inicial.marcadas) ||
    otro !== inicial.otro ||
    hinchazon !== inicial.hinchazon ||
    indicaciones !== inicial.indicaciones ||
    proximo !== inicial.proximo ||
    nota !== inicial.nota;

  /*
    Al cambiar de tipo se limpian los campos que no le corresponden. Si no, una
    sesión que pasó a control llevaría su número de sesión y chocaría con los
    check constraints del esquema.
  */
  function cambiarTipo(nuevo: TipoEntrada) {
    if (editando || nuevo === tipo) return;
    setTipo(nuevo);
    if (nuevo !== "kine") {
      setNumero("");
      setMarcadas(new Set());
      setOtro("");
      setHinchazon(null);
    }
    if (nuevo !== "control") {
      setIndicaciones("");
      setProximo("");
    }
  }

  function alternarAutorizacion(etiqueta: string) {
    setMarcadas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(etiqueta)) siguientes.delete(etiqueta);
      else siguientes.add(etiqueta);
      return siguientes;
    });
  }

  function datos(): EntradaFormulario {
    const esKine = tipo === "kine";
    const esControl = tipo === "control";
    // "Otro" se guarda con lo escrito, nunca con la palabra "Otro".
    const textoOtro = otro.trim();
    const autorizado = esKine
      ? [
          ...AUTORIZACIONES.filter((a) => a !== OTRO && marcadas.has(a)),
          ...(marcadas.has(OTRO) && textoOtro ? [textoOtro] : []),
        ]
      : [];

    return {
      fecha,
      tipo,
      numero_sesion: esKine && numero.trim() ? Number(numero) : null,
      autorizado,
      hinchazon: esKine ? hinchazon : null,
      indicaciones: esControl ? indicaciones : null,
      proximo_control: esControl && proximo ? proximo : null,
      nota,
    };
  }

  function guardar() {
    setError("");
    iniciarGuardado(async () => {
      const r = await llamarAccion(() =>
        editando ? actualizarEntrada(entrada.id, datos()) : guardarEntrada(datos()),
      );
      // Si falla, la hoja queda abierta con lo escrito.
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  function eliminar() {
    setError("");
    iniciarEliminado(async () => {
      const r = await llamarAccion(() => eliminarEntrada(entrada!.id));
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  }

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={editando ? "Editar registro" : "Nuevo registro"}
      hayCambios={hayCambios}
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <Etiqueta>Tipo de registro</Etiqueta>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {/* Al editar el tipo no cambia: solo se muestra el que tiene. */}
            {(editando ? TIPOS.filter((t) => t.valor === tipo) : TIPOS).map((t) => (
              <Chip
                key={t.valor}
                etiqueta={t.etiqueta}
                encendido={tipo === t.valor}
                onToggle={() => cambiarTipo(t.valor)}
              />
            ))}
          </div>
        </div>

        <div>
          <Etiqueta htmlFor={idFecha}>Fecha</Etiqueta>
          <input
            id={idFecha}
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className={CLASE_FECHA}
          />
        </div>

        {tipo === "kine" ? (
          <>
            <CampoNumerico
              etiqueta="Número de sesión"
              valor={numero}
              onChange={setNumero}
              modo="entero"
              placeholder={String(siguienteSesion(entradas))}
              className="w-[120px]"
            />

            <div>
              <Etiqueta>Autorizado hoy (opcional)</Etiqueta>
              <div className="mt-2 flex flex-wrap gap-[7px]">
                {AUTORIZACIONES.map((a) => (
                  <Chip
                    key={a}
                    etiqueta={a}
                    encendido={marcadas.has(a)}
                    onToggle={() => alternarAutorizacion(a)}
                  />
                ))}
              </div>
              {marcadas.has(OTRO) ? (
                <CampoTexto
                  etiqueta="Qué se autorizó"
                  etiquetaOculta
                  valor={otro}
                  onChange={setOtro}
                  placeholder="¿Qué se autorizó?"
                  maxLength={80}
                  className="mt-2.5"
                />
              ) : null}
            </div>

            <div>
              <Etiqueta>Hinchazón</Etiqueta>
              <div className="mt-1.5 flex gap-2">
                {HINCHAZONES.map((h) => (
                  <Chip
                    key={h.valor}
                    etiqueta={h.etiqueta}
                    encendido={hinchazon === h.valor}
                    // Tocar la elegida la desmarca.
                    onToggle={() => setHinchazon(hinchazon === h.valor ? null : h.valor)}
                    className="flex-1"
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tipo === "control" ? (
          <>
            <CampoTexto
              etiqueta="Indicaciones nuevas"
              variante="area"
              valor={indicaciones}
              onChange={setIndicaciones}
              placeholder="Iniciar carga parcial, 20 minutos de pie al día"
            />
            <div>
              <Etiqueta htmlFor={idProximo}>Próximo control (opcional)</Etiqueta>
              {/* Sin tope: el próximo control es, por definición, futuro. */}
              <input
                id={idProximo}
                type="date"
                value={proximo}
                onChange={(e) => setProximo(e.target.value)}
                className={CLASE_FECHA}
              />
            </div>
          </>
        ) : null}

        <CampoTexto
          etiqueta="Notas"
          variante="area"
          valor={nota}
          onChange={setNota}
          placeholder="Cómo se sintió el tobillo, qué dijo el equipo"
        />

        <Boton onClick={guardar} disabled={ocupada}>
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar registro"}
        </Boton>

        {error ? (
          <p role="status" className="text-[13.5px] leading-relaxed text-tinta-2">
            {error}
          </p>
        ) : null}

        {editando ? (
          confirmando ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <p className="text-[13.5px] leading-relaxed text-tinta-2">
                ¿Eliminar este registro?
              </p>
              <Boton variante="secundaria" onClick={eliminar} disabled={ocupada}>
                {eliminando ? "Eliminando…" : "Eliminar"}
              </Boton>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={ocupada}
                className="h-[46px] text-[13.5px] text-tinta-3"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={ocupada}
              className="h-[46px] text-[13.5px] text-tinta-4"
            >
              Eliminar registro
            </button>
          )
        ) : null}
      </div>
    </HojaInferior>
  );
}

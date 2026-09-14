"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Boton from "@/components/ui/Boton";

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /**
   * Hay algo escrito sin guardar. Cerrar desde la propia hoja (el fondo,
   * "Cerrar" o Escape) pide confirmación antes de descartarlo. Sin cambios
   * cierra directo. Guardar no pasa por acá: el formulario llama a onCerrar.
   */
  hayCambios?: boolean;
};

/*
  Pila de hojas abiertas, compartida por todas las instancias.
  Permite abrir una hoja sobre otra: cada una se apila con más z-index que la
  anterior, Escape cierra solo la de más arriba y el scroll del body se libera
  recién cuando se cierra la última.
*/
const pila: symbol[] = [];
let scrollBloqueado = false;

function bloquearScroll() {
  if (scrollBloqueado) return;
  document.body.style.overflow = "hidden";
  scrollBloqueado = true;
}

function liberarScroll() {
  if (pila.length > 0) return;
  document.body.style.overflow = "";
  scrollBloqueado = false;
}

/* El portal necesita document: en el servidor no hay nada que montar. */
const noSuscribir = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

export default function HojaInferior({
  abierta,
  onCerrar,
  titulo,
  subtitulo,
  children,
  hayCambios = false,
}: Props) {
  const montado = useSyncExternalStore(noSuscribir, enCliente, enServidor);
  const [identidad] = useState(() => Symbol("hoja"));
  const refVelo = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);

  const pedirCierre = useCallback(() => {
    if (hayCambios) setConfirmando(true);
    else onCerrar();
  }, [hayCambios, onCerrar]);

  // Apilado y bloqueo de scroll. Depende solo de `abierta` para que un
  // re-render de la hoja (escribir en un campo) no la reordene en la pila.
  useEffect(() => {
    if (!abierta) return;
    pila.push(identidad);
    refVelo.current?.style.setProperty("z-index", String(50 + pila.length * 5));
    bloquearScroll();

    return () => {
      const i = pila.indexOf(identidad);
      if (i !== -1) pila.splice(i, 1);
      liberarScroll();
    };
  }, [abierta, identidad]);

  // Escape: solo reacciona la hoja de más arriba de la pila. Con la
  // confirmación abierta, la de arriba es ella.
  useEffect(() => {
    if (!abierta) return;
    function alPresionar(e: KeyboardEvent) {
      if (e.key !== "Escape" || pila[pila.length - 1] !== identidad) return;
      e.stopPropagation();
      pedirCierre();
    }
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierta, identidad, pedirCierre]);

  if (!montado || !abierta) return null;

  return (
    <>
      {createPortal(
        <div
          ref={refVelo}
          className="fixed inset-0 z-50 flex animate-velo items-end justify-center bg-velo"
        >
          {/* Fondo: cierra al tocarlo, o pide confirmación si hay cambios. */}
          <button
            type="button"
            aria-label="Cerrar"
            onClick={pedirCierre}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            // overscroll-contain: el scroll de la hoja no se encadena al documento.
            className="relative flex max-h-[88dvh] w-full max-w-[430px] animate-hoja flex-col overflow-y-auto overscroll-contain rounded-t-hoja bg-fondo"
          >
            <div className="sticky top-0 z-[2] border-b border-linea bg-fondo px-5 pb-3 pt-[14px]">
              <div className="mx-auto mb-[14px] h-1 w-[38px] rounded-sm bg-borde-fuerte" />
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-[22px] font-medium text-tinta">
                    {titulo}
                  </h2>
                  {subtitulo ? (
                    <p className="mt-0.5 text-[12.5px] text-tinta-3">{subtitulo}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={pedirCierre}
                  className="shrink-0 py-1.5 text-[14px] text-tinta-3"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
              {children}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {confirmando ? (
        <HojaDescartar
          abierta
          onSeguir={() => setConfirmando(false)}
          onDescartar={() => {
            setConfirmando(false);
            onCerrar();
          }}
        />
      ) : null}
    </>
  );
}

/*
  Confirmación para salir con cambios sin guardar. Una sola en toda la app: la
  usan las hojas con formulario, Configuración y el formulario de InBody.
  Cerrarla de cualquier forma (fondo, "Cerrar", Escape) es seguir editando.
*/
export function HojaDescartar({
  abierta,
  onSeguir,
  onDescartar,
}: {
  abierta: boolean;
  onSeguir: () => void;
  onDescartar: () => void;
}) {
  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onSeguir}
      titulo="Tienes cambios sin guardar"
    >
      <p className="text-[14.5px] leading-relaxed text-tinta-2">
        Si sales ahora, se pierden los cambios que todavía no guardaste.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <Boton onClick={onSeguir}>Seguir editando</Boton>
        <Boton variante="secundaria" onClick={onDescartar}>
          Descartar y salir
        </Boton>
      </div>
    </HojaInferior>
  );
}

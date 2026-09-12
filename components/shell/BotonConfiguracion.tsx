import Link from "next/link";

/*
  Acceso a Configuración. Vive SOLO en el encabezado de Hoy y se desliza con
  el contenido.

  Antes era fijo y estaba en todas las pantallas: al bajar quedaba flotando
  sobre las tarjetas y se montaba encima de sus botones (en Menús pisaba el
  "Editar" de la primera tarjeta). Configuración se entra una vez cada tanto;
  no justifica ocupar una esquina de forma permanente.
*/
export default function BotonConfiguracion({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="/configuracion"
      aria-label="Configuración"
      // 38×38 de área táctil, el mínimo cómodo para el pulgar.
      className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control border border-linea bg-fondo/92 ${className}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="-12 -12 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-tinta-3"
        aria-hidden
      >
        <circle r="4.2" />
        <circle r="9" strokeDasharray="3 2.4" />
      </svg>
    </Link>
  );
}

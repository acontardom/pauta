import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { PANTALLAS_IPHONE, mediaSplash, urlSplash } from "@/lib/splash";
import { COLOR_FONDO } from "@/lib/tokens";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Pauta",
  title: "Pauta",
  description: "Pauta nutricional por porciones y recuperación de tobillo.",
  appleWebApp: {
    capable: true,
    title: "Pauta",
    // "default" y no "black-translucent": con fondo claro el reloj quedaría
    // en blanco sobre blanco y no se leería.
    statusBarStyle: "default",
    // Pantallas de arranque generadas con "npm run iconos". Sin la que calza
    // con el iPhone, la app instalada abre en blanco.
    startupImage: PANTALLAS_IPHONE.map((p) => ({
      url: urlSplash(p),
      media: mediaSplash(p),
    })),
  },
  // iOS convierte en enlace lo que parece un teléfono o una fecha, y un toque
  // ahí saca al usuario de la app. Ningún número de la app es un teléfono.
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  other: {
    // Next emite el moderno "mobile-web-app-capable"; iOS anterior a 17 solo
    // lee este, y sin él la app abriría con la barra de Safari.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: COLOR_FONDO,
  // Sin maximum-scale ni userScalable: el zoom al enfocar se evita con los
  // 16px mínimos de los inputs, no bloqueando el zoom del usuario.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CL"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full justify-center bg-marco font-sans text-tinta">
        {/* overflow-x-clip y no hidden: corta un desborde accidental a lo
            ancho sin volver la columna un contenedor de scroll. */}
        <div className="relative min-h-screen w-full max-w-[430px] overflow-x-clip bg-fondo shadow-columna">
          {children}
        </div>
      </body>
    </html>
  );
}

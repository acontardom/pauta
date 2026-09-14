/*
  Genera los íconos y las pantallas de arranque desde public/logo.png.

    npm run iconos

  Íconos (el logo a tamaño completo):
    app/icon.png         192×192  <link rel="icon"> y manifest
    app/apple-icon.png   180×180  pantalla de inicio de iOS
    public/icon-512.png  512×512  manifest

  Pantallas de arranque: una por tamaño de iPhone de lib/splash.ts, en
  public/splash/, con el logo centrado sobre el fondo de la app.

  Todo se aplana sobre COLOR_FONDO y sin canal alfa: iOS pinta negro detrás
  de la transparencia al aplicar la máscara redondeada del ícono.
*/
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  ANCHO_LOGO_SPLASH,
  PANTALLAS_IPHONE,
  pixelesSplash,
  urlSplash,
} from "../lib/splash";
import { COLOR_FONDO } from "../lib/tokens";

const RAIZ = resolve(__dirname, "..");
const LOGO = resolve(RAIZ, "public/logo.png");

const ICONOS = [
  { archivo: "app/icon.png", lado: 192 },
  { archivo: "app/apple-icon.png", lado: 180 },
  { archivo: "public/icon-512.png", lado: 512 },
];

function imprimir(texto = "") {
  process.stdout.write(`${texto}\n`);
}

function logoA(lado: number) {
  return sharp(LOGO)
    .resize(lado, lado, { kernel: "lanczos3" })
    .flatten({ background: COLOR_FONDO })
    .removeAlpha();
}

async function generarIconos() {
  for (const { archivo, lado } of ICONOS) {
    await logoA(lado).png().toFile(resolve(RAIZ, archivo));
    imprimir(`  ${archivo}  ${lado}×${lado}`);
  }
}

async function generarSplash() {
  mkdirSync(resolve(RAIZ, "public/splash"), { recursive: true });

  for (const pantalla of PANTALLAS_IPHONE) {
    const { ancho, alto } = pixelesSplash(pantalla);
    const lado = ANCHO_LOGO_SPLASH * pantalla.densidad;
    const logo = await logoA(lado).png().toBuffer();

    const archivo = `public${urlSplash(pantalla)}`;
    const compuesta = await sharp({
      create: { width: ancho, height: alto, channels: 3, background: COLOR_FONDO },
    })
      .composite([
        {
          input: logo,
          left: Math.round((ancho - lado) / 2),
          top: Math.round((alto - lado) / 2),
        },
      ])
      .png()
      .toBuffer();

    // composite agrega un canal alfa; se quita en un segundo paso, igual que en
    // los íconos, para que la imagen quede opaca.
    await sharp(compuesta).removeAlpha().png().toFile(resolve(RAIZ, archivo));

    imprimir(`  ${archivo}  (${pantalla.modelos})`);
  }
}

async function main() {
  imprimir("\n  Íconos");
  await generarIconos();
  imprimir("\n  Pantallas de arranque");
  await generarSplash();
  imprimir();
}

main().catch((error: unknown) => {
  process.stderr.write(`\n  No se pudieron generar las imágenes: ${String(error)}\n\n`);
  process.exit(1);
});

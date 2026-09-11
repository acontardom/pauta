import { ImageResponse } from "next/og";
import { COLOR_FONDO, COLOR_VERDE } from "@/lib/tokens";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/*
  Ícono de la pantalla de inicio de iOS. Sin esquinas redondeadas propias ni
  transparencia: iOS recorta la máscara. Provisional, el definitivo va en la tarea 11.
*/
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLOR_FONDO,
        }}
      >
        <div
          style={{
            width: 98,
            height: 98,
            borderRadius: 32,
            background: COLOR_VERDE,
          }}
        />
      </div>
    ),
    size,
  );
}

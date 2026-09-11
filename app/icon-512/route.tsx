import { ImageResponse } from "next/og";
import { COLOR_FONDO, COLOR_VERDE } from "@/lib/tokens";

export const dynamic = "force-static";

/* Variante de 512 que pide el manifest. Provisional, igual que app/icon.tsx. */
export function GET() {
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
            width: 278,
            height: 278,
            borderRadius: 90,
            background: COLOR_VERDE,
          }}
        />
      </div>
    ),
    { width: 512, height: 512 },
  );
}

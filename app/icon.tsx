import { ImageResponse } from "next/og";
import { COLOR_FONDO, COLOR_VERDE } from "@/lib/tokens";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

/* Ícono provisional: una forma simple, sin texto. El definitivo va en la tarea 11. */
export default function Icon() {
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
            width: 104,
            height: 104,
            borderRadius: 34,
            background: COLOR_VERDE,
          }}
        />
      </div>
    ),
    size,
  );
}

/*
  Los colores viven en app/globals.css (@theme) y la UI los usa solo por token.

  Un puñado de lugares no puede leer CSS: el manifest, el theme-color de iOS y
  los íconos generados con ImageResponse. Esos valores se declaran aquí, una
  sola vez, para que ningún componente tenga que escribir un hex suelto.
*/
export const COLOR_FONDO = "#FAF7F2";
export const COLOR_VERDE = "#4F7A5D";

/*
  Los colores viven en app/globals.css (@theme) y la UI los usa solo por token.

  Dos lugares no pueden leer CSS: el manifest y el theme-color de iOS. Ese
  valor se declara aquí, una sola vez, para que ningún componente tenga que
  escribir un hex suelto.
*/
export const COLOR_FONDO = "#FAF7F2";

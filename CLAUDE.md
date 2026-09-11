# Pauta

## Qué es la app
Seguimiento personal de una pauta nutricional **por porciones** (nunca por calorías)
y de la recuperación de una operación de tobillo.

- Un solo usuario.
- Se usa desde un iPhone, instalada como PWA en la pantalla de inicio.
- Uso diario de **menos de un minuto**: cada pantalla tiene que resolverse de un vistazo.
- Interfaz completamente en español de Chile.

## Stack
- Next.js (App Router) + TypeScript, desplegado en Vercel.
- Supabase para base de datos y autenticación (desde la tarea 2).
- Tailwind CSS v4 (tokens con `@theme` en `app/globals.css`).
- Vitest para pruebas unitarias (`npm test`).
- PWA en iOS sin service worker: la app requiere conexión.

## Reglas de producto
1. Cada comida queda **completa**, **estimada** (comí fuera) o **pendiente**.
   Las estimadas no cuentan como incumplimiento: no disparan alertas ni bajan métricas.
2. La métrica semanal principal es **días registrados** (días cerrados sobre 7),
   no un porcentaje de cumplimiento.
3. **Nada se marca en rojo** por haber comido distinto. El ámbar es el único color
   de atención y se usa con moderación.
4. Se puede navegar a días anteriores para completarlos.
5. Los deltas de InBody tienen **dirección semántica**:
   - Bajar es bueno en peso, masa grasa, % de grasa y grasa visceral.
   - Bajar es malo en masa musculoesquelética, masa libre de grasa y agua corporal total.
6. Los hitos de recuperación guardan **fecha planificada** y **fecha real**,
   y muestran la diferencia en días.

## Convenciones
- **Idioma:** toda la UI en español de Chile. Nombres de componentes, props y
  funciones también en español.
- **Fechas:** siempre con `lib/fechas.ts`. Son strings `"YYYY-MM-DD"` que representan
  días calendario en **America/Santiago**. Vercel corre en UTC: nunca usar
  `new Date().toISOString().slice(0,10)` para obtener "hoy".
- **Números:** siempre con `lib/numeros.ts` (coma decimal, máximo 1 decimal, `—` si no hay dato).
- **Colores:** solo desde tokens de `app/globals.css`. Ningún hex suelto en
  `app/` ni `components/`. Las únicas excepciones son `lib/tokens.ts`, que alimenta
  el manifest y los íconos generados.
- **Componentes:** antes de crear uno nuevo, revisar `components/ui`.
- **Inputs numéricos:** siempre `CampoNumerico`. Nunca `type="number"`: en iOS
  descarta la coma decimal del teclado chileno. Mínimo 16px de fuente para que
  iOS no haga zoom al enfocar.
- **Sin almacenamiento del navegador:** no usar `localStorage` ni `sessionStorage`.
- **Sin librerías** de componentes, íconos ni animaciones. Los íconos son SVG propios.
- **Sin modo oscuro.**

## Radios del diseño
- 11px (`rounded-control`): inputs y botones chicos.
- 14px (`rounded-tarjeta`): tarjetas y botón principal.
- 20px (`rounded-hoja`): parte superior de las hojas inferiores.
- Píldora completa (`rounded-full`): chips.

## Referencia de diseño
En `docs/diseno/`:
- `Pauta nutricional vf.html`: bundle exportado de Claude Design. Se **abre en el
  navegador** para ver el diseño; no se lee como código.
- `diseno-fuente.html`: versión legible del mismo diseño. Sus estilos en línea son
  la fuente de verdad visual (colores, tamaños, radios, espaciados, tipografía).

Advertencias:
- Es referencia **visual y de comportamiento**, no de arquitectura: el prototipo usa
  localStorage y estado en memoria; la app real usa Supabase y rutas de Next.js.
- `seed()`, `defaultRecovery()` y todos los días, pesos, mediciones InBody y sesiones
  de kinesiología del prototipo son **datos de ejemplo**. No deben llegar a la base
  de datos real salvo que se indique explícitamente.
- No reproducir la sintaxis de plantillas de Claude Design ni los estilos en línea:
  todo con Tailwind y tokens.
- **No modificar nada dentro de `docs/diseno/`.**

## Forma de trabajo
- El proyecto se construye por **tareas numeradas**.
- **No se implementa nada de tareas futuras**, ni siquiera "dejarlo preparado".
- Cada tarea termina con la lista de archivos tocados y cómo verificar.
- Verificación de cada tarea: `npm run build`, `npm run lint` y `npm test` sin errores.

## Las 11 tareas
| # | Tarea | Estado |
|---|---|---|
| 1 | Base del proyecto | En curso |
| 2 | Esquema y autenticación | Pendiente |
| 3 | Datos semilla | Pendiente |
| 4 | Hoy: registro de comidas | Pendiente |
| 5 | Hoy: resto del día | Pendiente |
| 6 | Menús | Pendiente |
| 7 | Semana | Pendiente |
| 8 | Progreso | Pendiente |
| 9 | Recuperación | Pendiente |
| 10 | Configuración | Pendiente |
| 11 | Pulido PWA | Pendiente |

## Estado actual (tarea 1)
Esqueleto, sistema de diseño, componentes compartidos y utilidades. Sin datos ni
lógica de negocio: cada pantalla muestra solo su encabezado y "En construcción".

- Rutas: `/hoy`, `/semana`, `/progreso`, `/menus`, `/recuperacion`, `/configuracion`,
  todas bajo el grupo `app/(app)/` con el shell común. `/` redirige a `/hoy`.
- `app/componentes/` es una página temporal de revisión visual: **se elimina en la tarea 11**.

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
- Supabase para base de datos y autenticación (`@supabase/supabase-js` + `@supabase/ssr`).
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

## Autenticación
Un solo usuario, con **correo y contraseña**. El correo autorizado está en
`EMAIL_PERMITIDO` (variable **solo de servidor**: nunca con prefijo `NEXT_PUBLIC_`).

**Por qué contraseña y no enlace ni código.** En iOS una PWA instalada guarda
sus cookies en un contenedor separado de Safari: el enlace de un correo abriría
Safari y la app instalada seguiría sin sesión. Un código de un solo uso lo
habría resuelto, pero Supabase **no deja personalizar las plantillas de correo
en plan free** con el proveedor por defecto, y las de fábrica traen solo el
enlace, sin código. Con contraseña no interviene el correo en ningún momento:
se escribe dentro de la app y la sesión queda en su propio contenedor.

- **El registro está cerrado** (`enable_signup = false`). El usuario se crea una
  sola vez desde el dashboard de Supabase; `/entrar` solo inicia sesión.
- La sesión va en **cookies**, nunca en `localStorage` ni `sessionStorage`.
- `proxy.ts` (lo que hasta Next 15 se llamaba `middleware.ts`) refresca la sesión
  en cada request y protege las rutas. Del matcher quedan fuera `/entrar`, los
  estáticos y **el manifest y los íconos**: iOS los pide sin sesión al instalar
  la app.
- Si hay sesión de un correo distinto al permitido, se cierra y se vuelve a `/entrar`.
- Clientes: `lib/supabase/cliente.ts` (navegador) y `lib/supabase/servidor.ts`
  (Server Components, Server Actions y Route Handlers).
- **No hay recuperación de contraseña dentro de la app**, porque eso exigiría
  correo: se cambia desde el dashboard de Supabase.

## Esquema de la base
10 tablas, todas con `id`, `user_id` (por defecto `auth.uid()`), `created_at` y
`updated_at` (un trigger compartido lo mantiene). **RLS activo en todas**, con
políticas de select/insert/update/delete solo para `authenticated`. Ninguna para `anon`.

| Tabla | Para qué |
|---|---|
| `configuracion` | metas y horarios. Una fila por usuario |
| `dias` | el día como unidad; `cerrado` alimenta "días registrados" |
| `menus` | plantillas de comida reutilizables |
| `comidas` | una fila por (fecha, tiempo) |
| `alimentos` | tabla de equivalencias por grupo |
| `medidas` | peso y cintura; varios registros por fecha |
| `inbody` | composición corporal |
| `hitos` | etapas de recuperación, con fecha planificada y real |
| `entradas_recuperacion` | controles, kinesiología y notas |
| `preguntas_control` | qué preguntar en el próximo control |

**Claves de dominio** (iguales en la base y en `lib/dominio.ts`; si cambian en
una, cambian en la otra):
- Grupos: `cereales`, `verduras`, `fruta`, `proteicos`, `lacteos`, `aceite`, `grasas`
- Tiempos: `desayuno`, `colacion_am`, `almuerzo`, `colacion_pm`, `cena`

Son `text` con check constraints, no enums. Toda columna `porciones` se valida
con la función `porciones_validas(jsonb)`.

**Reglas del esquema que hay que tener presentes:**
- **Una comida pendiente es la ausencia de fila en `comidas`.** Completa = modo
  `menu` o `manual`; estimada = modo `fuera`.
- Al registrar una comida desde un menú se **copian** `nombre_menu`, `porciones`
  y `kcal` a la fila de `comidas`. Así la comida conserva lo que se comió aunque
  el menú después se edite o se borre.
- `kcal_activas` en `dias` son calorías **gastadas**; `kcal` en `menus` y
  `comidas` son calorías **aportadas**.

Los tipos TypeScript están en `lib/supabase/tipos.ts`, escritos a mano y fieles
al esquema: si cambia la migración, cambian ellos en la misma tarea.

## Migraciones y configuración de Supabase
- Todo cambio de esquema es una **migración nueva**:
  `npx supabase migration new <nombre>`, aplicada con `npx supabase db push`.
- **Nunca se edita una migración ya aplicada.**
- **Ningún comando destructivo contra la base remota** (`db reset`, `drop`,
  `delete`, `truncate`) sin preguntar antes.
- `supabase/verificacion.sql` son consultas de solo lectura para revisar RLS,
  políticas y constraints.
- **`supabase/config.toml` es la fuente de verdad de la configuración de auth.**
  Todo cambio se hace ahí y se sube con `npx supabase config push`, nunca solo
  en el dashboard.
- `config.toml` declara **solo** lo que administramos. Todo lo que no declara,
  `config push` lo deja intacto: la plantilla completa de `supabase init`
  sobrescribiría ajustes reales del proyecto (MFA, Twilio, pooler, storage).
- **La app no manda correos.** Si algún día hicieran falta (recuperar contraseña,
  por ejemplo), hay que configurar SMTP propio: en plan free con el proveedor por
  defecto, Supabase rechaza las plantillas propias con un 400 que además bloquea
  el resto del `config push`.

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
| 1 | Base del proyecto | Terminada |
| 2 | Esquema y autenticación | Terminada |
| 3 | Datos semilla | Pendiente |
| 4 | Hoy: registro de comidas | Pendiente |
| 5 | Hoy: resto del día | Pendiente |
| 6 | Menús | Pendiente |
| 7 | Semana | Pendiente |
| 8 | Progreso | Pendiente |
| 9 | Recuperación | Pendiente |
| 10 | Configuración | Pendiente |
| 11 | Pulido PWA | Pendiente |

## Estado actual (tareas 1 y 2 terminadas)
Esqueleto, sistema de diseño y componentes (tarea 1), más el esquema completo con
RLS y el login con correo y contraseña (tarea 2). **Todavía no hay datos ni
pantallas**: cada pantalla muestra solo su encabezado y "En construcción".

- Rutas: `/hoy`, `/semana`, `/progreso`, `/menus`, `/recuperacion`, `/configuracion`,
  todas bajo el grupo `app/(app)/` con el shell común. `/` redirige a `/hoy`.
- `/entrar` vive fuera del shell.
- `/configuracion` tiene un bloque **provisorio** (correo, estado de la base y
  cerrar sesión) que la tarea 10 reemplaza.
- `app/componentes/` es una página temporal de revisión visual: **se elimina en la tarea 11**.

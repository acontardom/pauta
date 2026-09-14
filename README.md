# Pauta

App personal para seguir una pauta nutricional **por porciones** (nunca por
calorías) y la recuperación de una operación de tobillo. Es de un solo usuario
y se usa a diario desde un iPhone, instalada como PWA con "Agregar a pantalla
de inicio".

Pantallas: Hoy, Semana, Progreso, Menús, Recuperación y Configuración.

Las reglas de producto, el esquema y las convenciones están en
[CLAUDE.md](CLAUDE.md).

## Stack

- Next.js (App Router) + TypeScript, desplegado en Vercel (región `gru1`).
- Supabase: base de datos Postgres con RLS y autenticación con correo y contraseña.
- Tailwind CSS v4.
- Vitest para las pruebas unitarias.
- PWA sin service worker: la app necesita conexión.

## Correr en local

Requisitos: Node 20 o superior y un proyecto de Supabase ya creado.

```bash
npm install
cp .env.example .env.local   # y completar los valores
npm run dev                  # http://localhost:3000
```

Variables de `.env.local` (el detalle está en `.env.example`):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon o publishable). La protege RLS |
| `EMAIL_PERMITIDO` | Único correo con acceso. Solo de servidor |
| `MCP_TOKEN` | Token del servidor MCP (32 caracteres o más). Solo de servidor |
| `MCP_PASSWORD` | Contraseña del usuario, para que el servidor MCP abra sesión. Solo de servidor |
| `SUPABASE_SECRET_KEY` | Clave secreta, **solo local** y solo para el script de semilla |

`.env.local` está en `.gitignore`. La clave secreta nunca va a Vercel ni lleva
el prefijo `NEXT_PUBLIC_`.

El usuario se crea una sola vez desde el dashboard de Supabase: el registro
está cerrado y `/entrar` solo inicia sesión.

## Verificación

```bash
npm run build
npm run lint
npm test
```

## Migraciones

El proyecto trabaja directo contra la base remota, sin Supabase local.

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>   # una vez

npx supabase migration new <nombre>   # crea supabase/migrations/<fecha>_<nombre>.sql
npx supabase db push                  # aplica las migraciones pendientes
```

- Todo cambio de esquema es una migración nueva. Una migración ya aplicada no
  se edita.
- `supabase/verificacion.sql` tiene consultas de solo lectura para revisar RLS,
  políticas y constraints.
- La configuración de auth vive en `supabase/config.toml` y se sube con
  `npx supabase config push` (conviene revisar antes con `npx supabase config diff`).

## Semilla

Los datos iniciales están en `supabase/semilla/datos.json`.

```bash
npm run semilla:revisar   # muestra lo que insertaría, sin escribir nada
npm run semilla           # inserta lo que falta
```

- Valida el archivo completo antes de escribir: con un error no inserta nada.
- Solo inserta lo que falta, comparando por clave natural. Nunca actualiza ni
  borra, así que se puede correr las veces que sea.
- Cambiar un dato ya cargado en `datos.json` **no** lo actualiza en la base:
  eso se corrige desde la app.

## Íconos y pantallas de arranque

Todo sale de `public/logo.png`:

```bash
npm run iconos
```

Genera, sobre el fondo crema de la app y sin transparencia:

- `app/icon.png` (192), `app/apple-icon.png` (180) y `public/icon-512.png` (512);
- una pantalla de arranque por tamaño de iPhone en `public/splash/`.

Los tamaños de iPhone están en `lib/splash.ts`, que usan tanto el script como
el layout. Para sumar un modelo nuevo se agrega ahí y se vuelve a correr
`npm run iconos`. Las imágenes generadas se versionan.

## Servidor MCP

`/api/mcp` permite consultar y registrar desde un chat con Claude, como
conector remoto. Herramientas:

| Herramienta | Qué hace |
|---|---|
| `obtener_dia` | Comidas, totales por grupo, lo que falta para las metas, agua, calorías activas, entrenamiento, tobillo y cierre |
| `listar_menus` | Menús guardados, con su id |
| `registrar_comida` | Registra o reemplaza la comida de un tiempo (**escribe**) |
| `registrar_agua` | Suma agua al día (**escribe**) |
| `obtener_resumen_semana` | Días registrados, metas cumplidas por día y promedios |

Para activarlo:

1. Generar un token:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
2. En Vercel, agregar `MCP_TOKEN` (ese token) y `MCP_PASSWORD` (la contraseña
   del usuario de `EMAIL_PERMITIDO`), y volver a desplegar.
3. En Claude, agregar un conector personalizado con la URL
   `https://pauta-zeta.vercel.app/api/mcp` y el encabezado `access-key` con el
   token plano, sin "Bearer". (`Authorization` lo reserva Claude para OAuth; el
   servidor igual acepta `Authorization: Bearer <token>` si algún día se puede
   usar. Si llegan los dos, decide `access-key`.)
4. Dejar `registrar_comida` y `registrar_agua` en "pedir aprobación".

El servidor inicia sesión como el usuario, así que RLS filtra por su `user_id`
como en la app. Si la contraseña cambia en Supabase, hay que actualizar
`MCP_PASSWORD` en Vercel.

## Despliegue

Vercel despliega desde `main`. En el proyecto de Vercel van solo
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `EMAIL_PERMITIDO`,
`MCP_TOKEN` y `MCP_PASSWORD`.
La región `gru1` (São Paulo) está fijada en `vercel.json` porque ahí está la
base de Supabase.

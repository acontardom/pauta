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
- Servidor MCP en `/api/mcp` con `mcp-handler` v2, `@modelcontextprotocol/server`
  v2 y `zod` 4 (ver "Servidor MCP").
- PWA en iOS sin service worker: la app requiere conexión.
- **Región `gru1` (São Paulo)** en `vercel.json`: es donde está la base de
  Supabase. Sin eso, cada consulta cruza el continente dos veces.

## Reglas de producto
1. Cada comida queda **completa**, **estimada** (comí fuera) o **pendiente**.
   Las estimadas no cuentan como incumplimiento: no disparan alertas ni bajan métricas.
2. La métrica semanal principal es **días registrados** (días cerrados sobre 7),
   no un porcentaje de cumplimiento.
3. **Nada se marca en rojo** por haber comido distinto. El ámbar es el único color
   de atención y se usa con moderación.
4. Se puede navegar a días anteriores para completarlos.
5. Los deltas de InBody tienen **dirección semántica**:
   - Bajar es bueno en peso, masa grasa y % de grasa.
   - Bajar es malo en masa musculoesquelética, masa libre de grasa y agua corporal total.
   - **El diseño muestra grasa visceral: ignorarla, el campo no existe.**
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
  estáticos, **el manifest y los íconos** (iOS los pide sin sesión al instalar
  la app) y **`/api/mcp`**, que no usa cookies y valida su propio token.
- Si hay sesión de un correo distinto al permitido, se cierra y se vuelve a `/entrar`.
- Clientes: `lib/supabase/cliente.ts` (navegador) y `lib/supabase/servidor.ts`
  (Server Components, Server Actions y Route Handlers).
- **No hay recuperación de contraseña dentro de la app**, porque eso exigiría
  correo: se cambia desde el dashboard de Supabase.

## Esquema de la base
11 tablas, todas con `id`, `user_id` (por defecto `auth.uid()`), `created_at` y
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
| `rutinas` | sesiones tipo del plan de entrenamiento (ver "Rutinas de entrenamiento") |

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

## Semilla
Los datos iniciales viven en `supabase/semilla/datos.json` y se cargan con un
script, **nunca desde una migración ni desde `seed.sql`**.

```
editar datos.json  →  npm run semilla:revisar  →  npm run semilla
```

- `npm run semilla:revisar` muestra lo que haría sin escribir nada.
- `npm run semilla` **solo inserta lo que falta**, comparando por clave natural.
  Nunca hace update ni delete, así que se puede correr las veces que sea.
- Valida el archivo completo antes de escribir: un solo error y no inserta nada.
  Cada error indica su ruta exacta (`menus[3].porciones.aceite`).
- **Corolario importante:** cambiar un dato ya cargado en `datos.json` NO lo
  actualiza en la base. Las correcciones de datos ya cargados se hacen desde la app.
- **La semilla completa vuelve a insertar lo que se borró desde la app.** Ya
  pasó con las preguntas: el archivo tiene 7 y en la base queda 1. Para cargar
  una tabla nueva sin revivir filas borradas, filtrar por tabla (el archivo se
  valida entero igual):
  `npm run semilla:revisar -- --tabla rutinas` y `npm run semilla -- --tabla rutinas`.
  Mirar siempre la tabla de `semilla:revisar` antes de insertar.

### SUPABASE_SECRET_KEY
El script usa la clave secreta de Supabase, que **salta RLS**. Reglas:

- Vive solo en `.env.local`, que está en `.gitignore`.
- **Nunca en Vercel**, nunca con prefijo `NEXT_PUBLIC_`, nunca en un archivo versionado.
- **Nunca se imprime** en logs ni en la salida del script.
- Solo la usa `scripts/`. Nada de `app/`, `components/` ni `lib/` puede importar
  desde `scripts/`.

## Pantalla Hoy
`/hoy` acepta **`?fecha=YYYY-MM-DD`**. Sin el parámetro usa `hoyChile()`; si la
fecha es inválida o futura, redirige a `/hoy`. Los botones ‹ y › navegan con
`router.replace`, para no llenar el historial con un día por toque.

Es un Server Component que carga configuración, comidas del día, menús y
alimentos **en paralelo**; la interacción vive en un componente cliente con
`useOptimistic`, así la tarjeta y los contadores cambian antes de que responda
el servidor.

### Reglas de guardado por modo
Una comida es una fila por `(fecha, tiempo)`, con upsert sobre esa clave.

| Modo | Qué se guarda |
|---|---|
| `menu` | El contenido se lee **del menú en la base**, no del cliente: copia `nombre_menu`, `porciones` y `kcal`. Editar o borrar el menú después no cambia las comidas ya registradas. |
| `manual` | Porciones limpias y **no vacías**; `kcal` opcional; `menu_id`, `nombre_menu` y `texto_libre` en null. |
| `fuera` | `texto_libre` (por defecto "Comí fuera"); porciones limpias, que **pueden ir vacías**; `kcal` opcional; `menu_id` y `nombre_menu` en null. |

El `user_id` sale siempre de la sesión en el servidor, nunca de lo que manda el
cliente. Borrar la fila devuelve la comida a pendiente.

### Contador de kcal
Junto a los 7 grupos hay una tarjeta "Kcal" con la suma de las comidas que
tengan kcal, en formato `≈1.650`. Muestra `—` si ninguna comida aporta kcal, y
no lleva barra ni meta: es informativa, no una meta que cumplir.

**No confundir con `dias.kcal_activas`**, que es lo que se **gastó** en
actividad (las kcal del reloj). Son dos números distintos y no se suman ni se
restan entre sí en ninguna pantalla.

### El resto del día (tabla `dias`)
Agua, calorías activas, entrenamiento, tobillo y cierre viven en `dias`.

- **La fila se crea recién con el primer dato del día** (agua, kcal,
  entrenamiento, tobillo) o al cerrarlo. Registrar solo comidas **no la crea**.
- Sin fila, los valores por defecto son `agua_ml` 0, `cerrado` false y el resto
  null o `[]`.
- Agua, entrenamiento y tobillo guardan al toque. Las calorías activas guardan
  600 ms después de la última tecla, y también al perder el foco.
- **Las únicas opciones de entrenamiento son las sesiones de las rutinas
  activas** ("Sesión A", "Sesión B", de `etiquetaSesion`), armadas por
  `opcionesEntrenamiento` en `lib/rutinas.ts`, que devuelve `{ etiqueta, nombre }`.
  Cada chip va en dos líneas: la sesión y, en chico, el nombre de la rutina
  (`Chip` con `detalle`). Ya no hay opciones fijas: `ENTRENAMIENTOS` se eliminó.
  `entrenamiento` (`text[]`) guarda **el texto de la etiqueta**, no un id:
  **cambiar la forma de la etiqueta rompe los registros viejos**.
- **Valores antiguos:** "Tren superior", "Core", "Bicicleta", "Kinesiología" y
  "Descanso" dejaron de ser opciones, pero hay días que los tienen. Nunca se
  borran ni se migran, y toda la app muestra cualquier texto que venga de la
  base: en Hoy como chip marcado al final (tocarlo lo quita y ya no se puede
  volver a elegir), en el cierre y en Semana como texto. Por eso `guardarDia`
  valida `entrenamiento` contra las sesiones activas **y lo que el día ya tenía
  guardado** (`validarDia` recibe `permitidas`; sin ella no acepta ningún texto).
- **Sin minutos de entrenamiento.** La columna `dias.entrenamiento_minutos`
  sigue en la base, sin usar y sin migración: no se muestra en Hoy, ni en el
  cierre, ni en `obtener_dia` del MCP, y los días viejos que la tienen se ven igual.
- `lib/dia.ts` tiene `resumenDia` (las 8 filas de la hoja de cierre),
  `textoAgua` (dos decimales fijas) y `textoLitros` (hasta dos, sin relleno).

**Cerrar el día es un registro, no una evaluación.** Se puede cerrar con
comidas pendientes y el día cuenta igual como día registrado; en la hoja de
cierre las pendientes dicen "Sin registro" en tono neutro, el mismo nombre que
en las leyendas (la tarjeta de comida sí dice "Pendiente": ahí es algo por
completar durante el día). Un día anterior sin cerrar es "Día abierto". Reabrir
no pide confirmación. Los días anteriores se completan y cierran igual que hoy.

Borrar el registro de una comida pide confirmación en la misma hoja
("Eliminar" y "Cancelar"), como el resto de las eliminaciones.

### Hoja de rutina
"Ver rutina", a la derecha del título de la tarjeta de entrenamiento, abre
`HojaRutina`: título con el nombre del bloque, `Segmentos` con una pestaña por
rutina activa ("A · Empuje + core") y una tarjeta por ejercicio en su orden.
Abre en la sesión marcada ese día; con las dos o ninguna, en la primera
(`rutinaInicial`). **Es solo de lectura:** no se marca ejercicio por ejercicio
ni se registran pesos ni repeticiones. Lo que se registra es la sesión, con el
chip.

**A la vista queda solo lo esencial, el resto se despliega:**
- La nota del bloque parte oculta, tras "Ver reglas del bloque" / "Ocultar
  reglas"; al abrirla aparece la tarjeta verde.
- Cada ejercicio muestra número y nombre, y debajo tres celdas iguales
  (Series, Reps, Descanso, de `celdasEjercicio`) con la etiqueta en mayúsculas
  y el valor en serif. Si tiene notas, "Ver nota" / "Ocultar"; sin notas no
  hay botón. Cada ejercicio abre y cierra por su cuenta.
- Todo parte cerrado cada vez que se abre la hoja: se monta al abrirse, así
  que el estado no sobrevive entre aperturas.

## Rutinas de entrenamiento
Tabla `rutinas`: una fila por sesión tipo. `bloque` es el nombre del plan,
`clave` ("A", "B"), `nombre`, `orden`, `activa`, `nota` (reglas del bloque:
RIR, progresión, posición) y `ejercicios`, un jsonb con
`{ orden, nombre, series, reps, descanso_seg, notas }`. Único por
`(user_id, bloque, clave)`. El check `ejercicios_validos(jsonb)` exige un
arreglo de objetos con `nombre` no vacío, `series` entero > 0 y `reps` texto no
vacío; el validador de la semilla repite esas reglas.

- **Van en la base, no en el código**, porque el plan cambia cada pocas semanas.
- **No se editan desde la app:** se cargan por semilla. Hoy solo lee las activas.
- `lib/rutinas.ts` tiene la lógica pura; el mapeo a etiqueta corta de Semana
  ("Sesión A" → "A", y los antiguos "Bicicleta" → "Bici", "Kinesiología" →
  "Kine", "Descanso" → "Desc") es `entrenamientoCorto` en `lib/dominio.ts`.
- **Cambiar de plan:** agregar a `rutinas` en `datos.json` las sesiones del
  bloque nuevo (con otro `bloque`), correr
  `npm run semilla:revisar -- --tabla rutinas` y
  `npm run semilla -- --tabla rutinas`, y desactivar las del bloque anterior
  (`activa = false`). Como la semilla nunca hace update, desactivar se hace con
  un `update` sobre la base (SQL Editor o `npx supabase db query --linked`), y
  además se deja `"activa": false` en esas filas de `datos.json`, para que una
  carga desde cero reproduzca el mismo estado. Es reversible: volver a
  `activa = true` revive el bloque. Si el
  bloque nuevo reutiliza las claves A y B, los días viejos siguen diciendo
  "Sesión A" y se ven igual; si usa otras claves, las viejas se muestran como
  valores antiguos.

## Pantalla Menús
`/menus` lista, crea, edita y elimina menús. Agrupados por tiempo en el orden
de `TIEMPOS`, alfabéticos dentro de cada grupo; los grupos vacíos no se
muestran. El formulario vive en una `HojaInferior` y reutiliza
`SelectorPorciones` **sin metas ni equivalencias**.

Arriba hay una fila de chips para filtrar por tiempo ("Todos" más los tiempos
que tengan menús). Es estado local, no va en la URL: es un atajo para llegar a
un grupo, no una preferencia que valga la pena recordar.

**Eliminar un menú no altera los días ya registrados.** La comida guarda su
propia copia de `nombre_menu`, `porciones` y `kcal` al registrarse, y la clave
foránea es `on delete set null`: solo se pierde el vínculo `menu_id`. Un día ya
cerrado no puede cambiar porque después se editó o se borró un menú. Las
acciones de menús **nunca** tocan la tabla `comidas`.

Toda mutación de menús revalida `/menus` **y `/hoy`**, porque Hoy lista los
menús en su hoja de registro.

## Pantalla Semana
`/semana` mira los **últimos 7 días móviles, terminando hoy**. No es de lunes a
domingo, y **no hay navegación a semanas anteriores**: lo que importa es qué tan
cubierto está el registro reciente.

- La métrica principal es **días registrados** (días con `cerrado = true` sobre
  7). **Nunca un porcentaje de cumplimiento**, en ninguna pantalla.
- Los días con comidas estimadas se pintan en azul y **no bajan ninguna
  métrica**: sus porciones suman igual.
- Se carga con **una consulta por tabla para todo el rango**, nunca una por día.
- Bajo la grilla, la tarjeta **Entrenamiento**: 7 columnas con los mismos
  márgenes y gap que la grilla (una por día, en el orden de sus filas, con la
  etiqueta del día arriba) y píldoras cortas de lo marcado: sesiones en verde,
  Bici y Kine neutras, Desc en "vacio", un guion si no hay nada; un valor que
  no se reconoce va con sus dos primeras letras. Debajo, "4 sesiones esta
  semana", contando solo sesiones de rutina (`entrenamientoSemana` y
  `textoSesiones`).

`lib/semana.ts` es el lugar de la lógica de agregación, toda pura y sin JSX:
`construirSemana`, `promedios`, `observaciones` y los formateadores de texto.
Si otra pantalla necesita agregar por rango de fechas, va acá.

Las **observaciones** (máximo 4, en orden de prioridad) describen lo que pasó y
proponen algo concreto. Van con borde ámbar, el único color de atención.
Ninguna dice que algo se incumplió: un día estimado o un tiempo sin registrar
son datos, no faltas.

## Pantalla Progreso
**Orden de la pantalla, de arriba abajo:** la nota de la meta, % de grasa,
grasa y músculo, peso, cintura, el botón "Registrar peso y cintura" con "Ver
registros anteriores" debajo, y al final la sección InBody. Primero se mira
cómo va la cosa y recién después se registra: por eso el botón no va arriba.

`lib/progreso.ts` tiene la lógica de **series y deltas**, toda pura:
`ultimoYAnterior`, `delta`, `serieGrafico`, `progresoGrasa` y
`textoPctGrasa`. Si otra pantalla necesita un gráfico de línea, va acá.

- Los **gráficos se construyen a mano** (SVG de viewBox `0 0 320 120`), sin
  librería: son series de pocos puntos y una línea de meta.
- Los colores del SVG se toman de las variables CSS de los tokens
  (`var(--color-verde)`), porque `stroke` no acepta clases de Tailwind. Siguen
  siendo tokens, no hex sueltos.
- **Los deltas tienen dirección semántica:** en peso, cintura y % de grasa
  bajar es bueno y va en verde; subir es **neutro**, nunca rojo. El signo menos
  es U+2212, no un guion.
- **`medidas` permite varias filas por fecha**: se inserta, no se hace upsert.
  Pesarse dos veces el mismo día son dos datos.
- Se puede guardar **solo peso, solo cintura o ambos**. Un registro de solo
  peso no cuenta como dato de cintura en la serie ni en el delta.
- El `%` de grasa se muestra con **un decimal fijo** (`textoPctGrasa`), porque
  ahí el decimal comunica precisión de medición. La meta va con `formatear`,
  porque es un objetivo redondo.

### InBody
**`CAMPOS_INBODY` en `lib/dominio.ts` es la fuente** de las etiquetas, unidades,
direcciones y campos destacados: el formulario, las tarjetas comparativas y los
deltas salen de ahí. No repetir esas etiquetas a mano en una pantalla.

- **Los deltas de InBody sí tienen "malo"**, a diferencia de peso y cintura:
  bajar es bueno en peso, masa grasa y % de grasa; bajar es malo en masa
  musculoesquelética, masa libre de grasa y agua. Bueno en verde, malo en
  **ámbar**, sin cambio en tinta-3. Nunca rojo.
- El delta se redondea a un decimal **antes** de decidir el signo, para que un
  residuo de punto flotante no convierta un "±0" en "−0".
- `serieMultiple` pone varias series en la misma escala y **alinea el eje x
  por fecha, no por posición**: un null en una serie no corre sus puntos.
- Igual que `medidas`, `inbody` permite varias mediciones por fecha (insert,
  no upsert). Un campo vacío se guarda como null, muestra "—" y no genera
  delta. El % de grasa se valida entre 0 y 100.
- El formulario de InBody es **en línea**, no en hoja. Se abre **solo** desde
  "Agregar medición", al lado del título de la sección InBody, o al editar una
  medición; la vista baja hasta él. Las tarjetas de arriba (% de grasa, grasa y
  músculo) **no repiten ese botón** cuando están vacías: solo explican qué
  aparecería. Como no tiene fondo que tocar, la confirmación de cambios sin guardar la pide
  `PantallaProgreso` al cerrarlo ("Cancelar") o al reemplazarlo por otro
  ("Editar", "Agregar medición"); el formulario le avisa con `onCambios`.
- `CampoNumerico` tiene `tamano`: `normal`, `grande` (peso y cintura) y
  `compacto` (el formulario de dos columnas de InBody).

## Pantalla Recuperación
`lib/recuperacion.ts` tiene la lógica de esta pantalla, toda pura: `avance`,
`posicionEnPeriodo`, `resumenKine`, `siguienteSesion`, `diasTobillo`,
`franjaTobillo`, `notaTobillo`, `proximoControl`, `ordenarPreguntas`,
`lineaTiempo`, `notaHito`, `diferenciaCumplimiento` y `textoHistorial`.
Las validaciones están en `lib/validarEntrada.ts` y `lib/validarHito.ts`.

- Esta pantalla **registra una recuperación, no la evalúa**: ningún texto
  reprocha. "Peor" en el tobillo es un dato y va en **ámbar**, nunca rojo.
- La semana actual parte en 1 el día de la operación y tiene tope en las
  semanas totales: pasado el retorno no se lee "Semana 19 de 17".
- **Lo autorizado en kine es acumulativo**: cada cosa aparece una vez, con la
  sesión en que se autorizó por primera vez. Se usa `numero_sesion` y, si no
  está, la posición cronológica.
- **La franja del tobillo junta dos fuentes.** Manda `dias.estado_tobillo`; si
  el día no lo tiene, se toma la hinchazón de la sesión de kine de ese día
  (menos → mejor, igual → igual, más → peor). Sin eso, un día con kine pero
  sin registro en Hoy quedaría vacío.
- El próximo control es el `proximo_control` del control más reciente que lo
  tenga: si el último control no dejó fecha, vale la de uno anterior.
- **El control agendado se calcula, no se guarda.** `lineaTiempo` (que recibe
  `hoy`) agrega un ítem "Control médico · Control agendado" en la fecha del
  próximo control mientras sea hoy o posterior y no haya una entrada de tipo
  control en esa fecha. Lleva la distancia ("en 9 días", "mañana", "hoy"), es
  del grupo `control` (sale en Todo y Controles), se ve como un hito
  planificado pero en azul. Al tocarlo abre `HojaEntrada` en modo nuevo, con
  el tipo "Control médico" y su fecha ya cargados (prop `nueva`). Mientras la
  fecha no llega, los campos se pueden llenar de antemano pero guardar queda
  deshabilitado, con "Podrás registrar este control el 23 de septiembre." en
  tinta-3. Registrar el control ese día basta para que deje de aparecer.
- Preguntas: pendientes primero, las más nuevas arriba, y **desempate por
  texto**, porque la semilla insertó todas en el mismo instante y sin eso su
  orden cambiaría entre recargas. Con UI optimista, como en Hoy.

### Línea de tiempo, entradas e hitos
- **`AUTORIZACIONES` en `lib/dominio.ts`** es la lista de lo que se puede
  autorizar en kine. **"Otro" nunca se guarda como la palabra "Otro"**: abre un
  campo libre y en `autorizado` queda lo escrito.
- Una sesión de kine en la línea de tiempo muestra solo lo que autorizó **por
  primera vez**, igual que la tarjeta de kinesiología. Si no hay nada nuevo es
  "sin cambios" y va en tono apagado: una sesión más, no una falla.
- La línea de tiempo ordena por fecha. Un hito ordena por su fecha real si
  ya se cumplió y, si no, por la planificada. Los que no tienen ninguna van al
  final. Con la misma fecha van primero los hitos.
- **El historial de hitos es acumulativo.** Cada cambio de fecha planificada
  agrega `{ desde, hasta, motivo, fecha_cambio }` y nunca reemplaza los
  anteriores. El motivo puede ir vacío y el cambio se registra igual. El
  servidor arma el historial **a partir del hito guardado en la base**, no del
  que tiene abierto el formulario, así un guardado no puede borrar cambios.
- Adelantar un hito va en verde y atrasarlo en ámbar, en la línea de tiempo y
  en la hoja del hito. Nunca en rojo.
- La **fecha planificada** puede ser futura; la **fecha real** no: es algo que
  ya ocurrió. El campo tiene tope en hoy y `validarHito` lo revisa en el servidor.
- `validarEntrada` devuelve **todas** las columnas, con null en las que no
  corresponden al tipo, para no chocar con los check constraints. Al editar
  una entrada el tipo no cambia, y el servidor lo compara con lo guardado.
- Los hitos **fijos** (los de la semilla) no se pueden eliminar, y el servidor
  también lo revisa. Un hito creado desde la app va con `clave` null y
  `fijo` false.

**Diferencia deliberada con el diseño:** el formulario de control médico del
diseño tiene atajos para marcar un hito como cumplido y para reprogramarlo.
**No se construyeron.** Los hitos se editan solo en su propia hoja, para que
haya un único lugar donde cambian y su historial no quede repartido.

## Pantalla Configuración
**La configuración es la fuente de metas, horarios y fechas para todas las
pantallas.** Las metas mueven los contadores de Hoy y la grilla de Semana, los
horarios las tarjetas de comida, las metas objetivo las líneas de meta de
Progreso y las fechas la barra de avance de Recuperación.

- **Nunca se guarda un valor inválido ni incompleto.** `validarConfiguracion`
  (en `lib/validarConfiguracion.ts`) corre en el cliente antes de enviar y otra
  vez en el servidor, y devuelve **todos** los errores a la vez, cada uno con su
  campo. Los campos inválidos van con borde ámbar (`CampoNumerico` tiene la
  prop `invalido`) y el resumen va al pie. Nada en rojo.
- Sin fila guardada se muestran `CONFIGURACION_POR_DEFECTO` con un aviso, y la
  fila se crea al guardar (upsert sobre `user_id`).
- **Si la lectura falla, no se muestra el formulario.** Un error se vería igual
  que "no hay fila" y guardar pisaría la configuración real con los valores por
  defecto.
- Guardar revalida `/configuracion`, `/hoy`, `/semana`, `/progreso` y
  `/recuperacion`.
- Salir con cambios sin guardar (la flecha ‹ o una pestaña) pide confirmación
  en una hoja. Las pestañas se interceptan con un listener de clic **en fase de
  captura sobre `window`**, dentro de la propia pantalla: la barra inferior del
  shell no sabe nada de esto.
- La sección Cuenta muestra el correo de la sesión y el botón de cerrar sesión.

## Servidor MCP
`/api/mcp` expone la pauta a Claude como conector remoto (Streamable HTTP).
Cinco herramientas: `obtener_dia`, `listar_menus`, `registrar_comida`,
`registrar_agua` y `obtener_resumen_semana`.

- **Autenticación:** cada petición trae el token en el encabezado
  **`access-key`**, plano y sin "Bearer": Claude reserva `Authorization` para
  su token de OAuth y el conector no deja usarlo. Como alternativa se acepta
  `Authorization: Bearer <MCP_TOKEN>`. Si vienen los dos, decide `access-key`
  (el `Authorization` puede ser el OAuth de Claude). `lib/mcp/token.ts`:
  comparación en tiempo constante, mínimo 32 caracteres. Sin token o con uno
  inválido: 401, **sin** `WWW-Authenticate` (un desafío Bearer haría que Claude
  intente OAuth). Sin `MCP_TOKEN` en el servidor: 503.
- **RLS:** el endpoint inicia sesión como el usuario con `EMAIL_PERMITIDO` y
  `MCP_PASSWORD` (`lib/mcp/sesion.ts`) y usa ese JWT, así que RLS filtra por su
  `user_id` igual que en la app. **No usa la clave secreta**, que sigue sin ir a
  Vercel. El proyecto firma los JWT con clave asimétrica (ES256): no se pueden
  fabricar tokens de usuario. La sesión se cachea mientras viva la instancia.
  Si la contraseña cambia en Supabase, hay que cambiar `MCP_PASSWORD` en Vercel.
- `MCP_TOKEN` y `MCP_PASSWORD` son **solo de servidor**: nunca con prefijo
  `NEXT_PUBLIC_`, nunca en un archivo versionado.
- **Capas:** `lib/mcp/pauta.ts` tiene la lógica de las cinco herramientas sobre
  una interfaz `Repositorio`, sin MCP ni Supabase, y se prueba con un
  repositorio en memoria. `repositorio.ts` la implementa con Supabase y
  `servidor.ts` declara esquemas, descripciones y anotaciones.
- **Reglas de la app que repite:** las porciones de un menú se leen del menú
  guardado y se copian, igual que sus kcal (el parámetro `kcal` se ignora en
  modo menu); manual exige al menos una porción; fuera usa "Comí fuera" por
  defecto; en manual y fuera `kcal` es opcional y se valida con `validarComida`; no se registran fechas futuras (`validarComida` y
  `validarDia`); la semana son 7 días móviles (`construirSemana` y
  `promedios`). La regla de copiar el menú está también en
  `app/(app)/hoy/acciones.ts`: **si cambia en un lugar, cambia en el otro.**
- **Escrituras con confirmación:** `registrar_comida` y `registrar_agua`
  empiezan su descripción con "ESCRIBE EN LA BASE DE DATOS", piden
  confirmación explícita y van con `readOnlyHint: false`. Las de lectura van
  con `readOnlyHint: true`. El servidor no puede obligar a Claude a
  confirmar: en la configuración del conector, esas dos herramientas tienen que
  quedar en "pedir aprobación", nunca en "permitir siempre".
- `registrar_comida` sobre un tiempo ya registrado lo reemplaza (upsert por
  fecha y tiempo) y lo informa. `registrar_agua` suma, no reemplaza.

## Convenciones
- **Idioma:** toda la UI en español de Chile. Nombres de componentes, props y
  funciones también en español.
- **Fechas:** siempre con `lib/fechas.ts`. Son strings `"YYYY-MM-DD"` que representan
  días calendario en **America/Santiago**. Vercel corre en UTC: nunca usar
  `new Date().toISOString().slice(0,10)` para obtener "hoy".
- **Números:** siempre con `lib/numeros.ts` (coma decimal, máximo 1 decimal, `—` si no hay dato).
- **Colores:** solo desde tokens de `app/globals.css`. Ningún hex suelto en
  `app/` ni `components/`. Las únicas excepciones son `lib/tokens.ts`, que alimenta
  el manifest, el theme-color y las imágenes de `npm run iconos`.
- **Componentes:** antes de crear uno nuevo, revisar `components/ui` y
  `components/porciones`. Ya existen y se reutilizan:
  - `SelectorPorciones` — filas de +/− por grupo, con el paso de cada uno.
    Props `metas` y `extra` son opcionales (Menús lo usa sin ninguna de las dos).
  - `CampoTexto` — texto de una línea o área. Para números va `CampoNumerico`.
  - `Boton` — variantes `primaria`, `secundaria` y `estimada` (el azul de comí fuera).
- **Cálculos:** `lib/porciones.ts` (`textoPorciones`, `ajustarPorcion`,
  `limpiarPorciones`, `porcionesVacias`) y `lib/dia.ts` (`totalesDia`,
  `estadoComida`). No rehacer estas sumas a mano en una pantalla. El paso de
  cada grupo es `GRUPOS[].paso` en `lib/dominio.ts`.
- **Llamar una Server Action desde el cliente:** siempre atrapando el rechazo.
  Sin red la acción no devuelve `{ ok: false }`, rechaza, y sin catch la
  pantalla entera cae en `error.tsx`. `lib/red.ts` tiene `llamarAccion` (para
  acciones que devuelven `{ ok, error }`), `avisoDeFallo` y los textos
  `AVISO_SIN_CONEXION` y `AVISO_FALLO`. El aviso de sin conexión es uno solo en
  toda la app: "Sin conexión. Vuelve a intentarlo cuando tengas señal."
- **Hojas con formulario:** pasan `hayCambios` a `HojaInferior`. Con cambios,
  cerrar desde la hoja (fondo, "Cerrar" o Escape) abre `HojaDescartar`
  ("Seguir editando" / "Descartar y salir"), la misma confirmación de
  Configuración; sin cambios cierra directo. Los cambios se miden contra los
  valores con que abrió el formulario (porciones con `porcionesIguales`).
  Guardar llama a `onCerrar` directo y no pasa por la confirmación.
- **Etiquetas de formularios:** al editar, el botón dice "Guardar cambios".
  Al crear, las hojas se titulan "Nueva medida", "Nuevo menú", "Nuevo registro"
  y "Nuevo hito".
- **Inputs numéricos:** siempre `CampoNumerico`. Nunca `type="number"`: en iOS
  descarta la coma decimal del teclado chileno. Mínimo 16px de fuente para que
  iOS no haga zoom al enfocar.
- **Sin almacenamiento del navegador:** no usar `localStorage` ni `sessionStorage`.
- **Sin librerías** de componentes, íconos ni animaciones. Los íconos son SVG propios.
- **Sin modo oscuro.**

## PWA en iOS
- **Íconos y pantallas de arranque:** `npm run iconos` (`scripts/iconos.ts`)
  genera todo desde `public/logo.png`, aplanado sobre `COLOR_FONDO` y sin canal
  alfa. Las pantallas de arranque salen de `PANTALLAS_IPHONE` en
  `lib/splash.ts`, que también usa el layout para emitir los
  `apple-touch-startup-image`: iOS no escala la imagen, así que cada tamaño de
  iPhone necesita su entrada. Un iPhone nuevo se agrega ahí y se vuelve a correr
  el script. `proxy.ts` ya deja pasar los `.png` sin sesión.
- **Áreas seguras:** todo encabezado lleva
  `pt-[calc(env(safe-area-inset-top)+22px)]`; la barra, los botones fijos y el
  pie de las hojas suman `env(safe-area-inset-bottom)`.
- **Botones fijos** (Cerrar día en Hoy, Guardar en Configuración): van a
  `safe-area + 74px` del borde, sobre la barra. Los avisos van pegados encima
  del botón, no al final de la lista, y el padding inferior del contenido deja
  lugar para ambos.
- **Sin rebote:** `overscroll-behavior: none` en `html` y `body`; las hojas
  llevan `overscroll-contain` para conservar su scroll.
- **Sin scroll horizontal:** la columna del layout raíz tiene `overflow-x-clip`
  (no `hidden`, que la volvería contenedor de scroll).
- `formatDetection` apaga los enlaces automáticos de iOS (teléfonos, fechas):
  un toque ahí saca al usuario de la app.
- **Carga y error:** cada pantalla tiene su `loading.tsx`, armado con
  `components/ui/Esqueleto.tsx` (bloques sin animación). `app/error.tsx` muestra
  un mensaje neutro con "Reintentar" (usa `retry`, estable desde Next 16.3) y,
  sin red, el aviso de sin conexión. `app/not-found.tsx` lleva a `/hoy`.

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
| 3 | Datos semilla | Terminada |
| 4 | Hoy: registro de comidas | Terminada |
| 5 | Hoy: resto del día | Terminada |
| 6 | Menús | Terminada |
| 7 | Semana | Terminada |
| 8 | Progreso | Terminada (8a y 8b) |
| 9 | Recuperación | Terminada (9a y 9b) |
| 10 | Configuración | Terminada |
| 11 | Pulido PWA | Terminada |

## Estado actual (las 11 tareas terminadas)
Todas las pantallas están completas: `/hoy` (4 y 5), `/menus` (6), `/semana` (7),
`/progreso` (8), `/recuperacion` (9) y `/configuracion` (10), sobre el esqueleto
(1), el esquema con RLS y el login (2) y los datos iniciales (3). La tarea 11
sumó las pantallas de arranque, los esqueletos de carga, `error.tsx` y
`not-found.tsx`, el aviso de sin conexión y la limpieza final (ver "PWA en iOS").

`/hoy` tiene encabezado con navegación entre días y estado del día, contadores,
las cinco tarjetas con su hoja de registro, agua, calorías activas,
entrenamiento, tobillo y el botón de cierre con su hoja de resumen.

`dias.nota` sigue **sin usar**.

La semilla cargó configuración, 5 hitos, 21 menús, 105 alimentos, 1 medida,
1 InBody, 4 entradas de recuperación, 7 preguntas (6 ya se borraron desde la
app) y 6 rutinas: las 4 activas del bloque **"Bloque bota fase 2"** (A Empuje +
tríceps, B Pierna adaptada + core, C Tirón + bíceps, D Torso + pierna ligera) y
las 2 del "Bloque sin carga de tobillo", desactivadas al cambiar de plan.
`dias` y `comidas` las llena la app.

- Rutas: `/hoy`, `/semana`, `/progreso`, `/menus`, `/recuperacion`, `/configuracion`,
  todas bajo el grupo `app/(app)/` con el shell común. `/` redirige a `/hoy`.
- `/entrar` vive fuera del shell.
- La barra inferior va en este orden: Hoy · Recuperación · Semana · Progreso · Menús.
- **El acceso a Configuración está solo en Hoy**, dentro de su encabezado y a la
  derecha de la fila de la fecha. **No es fijo**: se desliza con el contenido.
  Antes era un botón fijo presente en todas las pantallas y, al bajar, quedaba
  flotando sobre las tarjetas y pisaba sus botones. Por eso ningún encabezado
  reserva ya espacio a la derecha: los títulos usan todo el ancho.
- Desde `/configuracion` se vuelve **siempre a `/hoy`**, con la flecha ‹ de su
  encabezado. No se recuerda la pestaña de origen.
- La página temporal `/componentes` **se eliminó en la tarea 10**. Para revisar
  un componente, se revisa en la pantalla que lo usa.

## Pendientes conocidos
Quedó fuera de la v1, a propósito:
- **Sin service worker ni modo offline.** La app requiere conexión. Una acción
  sin red muestra el aviso de sin conexión, pero **cambiar de pantalla sin red**
  no tiene cómo resolverse: Next recurre a una navegación completa y iOS muestra
  su propia página de error.
- **Sin edición de alimentos desde la app.** La tabla de equivalencias se carga
  con la semilla y solo se consulta.
- **Sin edición de rutinas desde la app**, ni registro de pesos, repeticiones o
  ejercicios. Las rutinas se cambian por semilla.
- **Sin exportación de datos.**
- **Sin atajos de hitos en el formulario de control médico.** El diseño trae
  atajos para marcar un hito como cumplido y para reprogramarlo; se decidió no
  construirlos para que los hitos cambien en un único lugar (su propia hoja) y
  su historial no quede repartido.

### Deuda para un rediseño futuro
Salió en la revisión de consistencia de la tarea 11 y se decidió **dejarla como
está**. No corregirla de a poco: se revisa entera en un rediseño.
- **Radios fuera de 11/14/20/píldora:** `rounded-xl`, `rounded-lg`,
  `rounded-md`, `rounded-sm` y radios a medida (`[10px]`, `[9px]`, `[7px]`,
  `[5px]`, `[4px]`, `[3px]`); píldoras con `rounded-[20px]` en vez de
  `rounded-full`.
- **Tamaños de fuente dispares:** títulos de pantalla de 27px y de 20px;
  etiquetas de sección en mayúsculas de 13, 12,5 y 11px; títulos serif de
  tarjeta de 19 a 17px; Segmentos de 40px de alto y Chip de 42px.
- **Tarjetas duplicadas:** Hoy, Progreso y Recuperación definen su propia
  `Tarjeta` local con padding distinto, y `components/ui/Tarjeta` solo la usa
  `/entrar`.
- **`text-white`** en `Boton`, `Segmentos` y el check de preguntas: es el
  blanco de Tailwind, no un token.
- **Terracota** en la línea de masa grasa: es lo más cercano a rojo de la app.
- **Mensajes:** "Sesión expirada" y los avisos de falta de configuración (que
  además se resuelven distinto en Hoy, Semana, Progreso y Recuperación).

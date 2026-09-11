-- ============================================================================
-- Esquema inicial de Pauta
--
-- Convenciones de todas las tablas:
--   id          uuid, clave primaria
--   user_id     uuid, dueño de la fila; por defecto auth.uid()
--   created_at  fijo al insertar
--   updated_at  lo mantiene el trigger tocar_updated_at()
--
-- Las claves de dominio (grupos y tiempos de comida) se validan con check
-- constraints sobre text, no con enums: agregar un valor a un enum obliga a
-- una migración con bloqueo, y un check se reemplaza sin drama.
--
-- Estas claves están duplicadas en lib/dominio.ts. Si cambian aquí, cambian allá.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Funciones auxiliares
-- ----------------------------------------------------------------------------

-- Mantiene updated_at en todas las tablas. Una sola función para las 10.
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $funcion$
begin
  new.updated_at := now();
  return new;
end;
$funcion$;

comment on function public.tocar_updated_at() is
  'Trigger compartido: pone updated_at = now() en cada UPDATE.';


-- Valida una columna de porciones: objeto jsonb cuyas claves son grupos
-- conocidos y cuyos valores son números >= 0. Las claves ausentes valen 0.
--
-- Se escribe como tres NOT EXISTS y no como un solo WHERE con OR porque
-- Postgres no garantiza el orden de evaluación de un OR: el cast a numeric
-- podría ejecutarse sobre un valor que no es número y reventar.
create or replace function public.porciones_validas(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $funcion$
  select
    jsonb_typeof(v) = 'object'
    and not exists (
      select 1 from jsonb_each(v) e
      where e.key not in (
        'cereales', 'verduras', 'fruta', 'proteicos', 'lacteos', 'aceite', 'grasas'
      )
    )
    and not exists (
      select 1 from jsonb_each(v) e
      where jsonb_typeof(e.value) <> 'number'
    )
    and not exists (
      select 1 from jsonb_each(v) e
      where jsonb_typeof(e.value) = 'number' and (e.value)::numeric < 0
    );
$funcion$;

comment on function public.porciones_validas(jsonb) is
  'true si el jsonb es un objeto {grupo: numero >= 0} con grupos conocidos.';


-- Valida la columna horarios: objeto cuyas claves son tiempos de comida y
-- cuyos valores son strings "HH:MM".
create or replace function public.horarios_validos(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $funcion$
  select
    jsonb_typeof(v) = 'object'
    and not exists (
      select 1 from jsonb_each(v) e
      where e.key not in (
        'desayuno', 'colacion_am', 'almuerzo', 'colacion_pm', 'cena'
      )
    )
    and not exists (
      select 1 from jsonb_each(v) e
      where jsonb_typeof(e.value) <> 'string'
    )
    and not exists (
      select 1 from jsonb_each(v) e
      where jsonb_typeof(e.value) = 'string'
        and (e.value #>> '{}') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    );
$funcion$;

comment on function public.horarios_validos(jsonb) is
  'true si el jsonb es un objeto {tiempo: "HH:MM"} con tiempos conocidos.';


-- ----------------------------------------------------------------------------
-- configuracion — una fila por usuario
-- ----------------------------------------------------------------------------
create table if not exists public.configuracion (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  metas_porciones jsonb not null
                    constraint configuracion_metas_porciones_validas
                    check (public.porciones_validas(metas_porciones)),
  meta_agua_ml    int
                    constraint configuracion_meta_agua_ml_no_negativa
                    check (meta_agua_ml >= 0),
  meta_pct_grasa  numeric,
  meta_peso       numeric,
  meta_cintura    numeric,
  horarios        jsonb
                    constraint configuracion_horarios_validos
                    check (horarios is null or public.horarios_validos(horarios)),
  fecha_operacion date,
  fecha_retorno   date,

  constraint configuracion_user_id_unico unique (user_id)
);

comment on table public.configuracion is
  'Metas y ajustes del usuario. Una fila por usuario.';


-- ----------------------------------------------------------------------------
-- dias — el día como unidad; "cerrado" es lo que cuenta para días registrados
-- ----------------------------------------------------------------------------
create table if not exists public.dias (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid()
                          references auth.users on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  fecha                 date not null,
  agua_ml               int not null default 0
                          constraint dias_agua_ml_no_negativa
                          check (agua_ml >= 0),
  kcal_activas          int
                          constraint dias_kcal_activas_no_negativa
                          check (kcal_activas >= 0),
  estado_tobillo        text
                          constraint dias_estado_tobillo_valido
                          check (estado_tobillo in ('mejor', 'igual', 'peor')),
  entrenamiento         text[] not null default '{}',
  entrenamiento_minutos int
                          constraint dias_entrenamiento_minutos_no_negativos
                          check (entrenamiento_minutos >= 0),
  cerrado               boolean not null default false,
  nota                  text,

  constraint dias_user_id_fecha_unico unique (user_id, fecha)
);

comment on column public.dias.kcal_activas is
  'Calorías gastadas en actividad.';
comment on column public.dias.cerrado is
  'El día se dio por registrado. Base de la métrica semanal de días registrados.';


-- ----------------------------------------------------------------------------
-- menus — plantillas reutilizables de comida
-- ----------------------------------------------------------------------------
create table if not exists public.menus (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  nombre       text not null,
  tiempo       text not null
                 constraint menus_tiempo_valido
                 check (tiempo in (
                   'desayuno', 'colacion_am', 'almuerzo', 'colacion_pm', 'cena'
                 )),
  ingredientes text[] not null default '{}',
  observacion  text,
  porciones    jsonb not null default '{}'
                 constraint menus_porciones_validas
                 check (public.porciones_validas(porciones)),
  kcal         int
                 constraint menus_kcal_no_negativas
                 check (kcal >= 0)
);

comment on column public.menus.kcal is 'Calorías que aporta el menú.';


-- ----------------------------------------------------------------------------
-- comidas — una fila por (fecha, tiempo)
--
-- Una comida PENDIENTE es la AUSENCIA de fila.
--   completa = modo 'menu' o 'manual'
--   estimada = modo 'fuera'   (comí fuera; no cuenta como incumplimiento)
--
-- Al registrar desde un menú se COPIAN nombre_menu, porciones y kcal. Así la
-- comida conserva lo que se comió aunque el menú después cambie o se borre.
-- ----------------------------------------------------------------------------
create table if not exists public.comidas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  fecha       date not null,
  tiempo      text not null
                constraint comidas_tiempo_valido
                check (tiempo in (
                  'desayuno', 'colacion_am', 'almuerzo', 'colacion_pm', 'cena'
                )),
  modo        text not null
                constraint comidas_modo_valido
                check (modo in ('menu', 'manual', 'fuera')),
  menu_id     uuid references public.menus on delete set null,
  nombre_menu text,
  texto_libre text,
  porciones   jsonb not null default '{}'
                constraint comidas_porciones_validas
                check (public.porciones_validas(porciones)),
  kcal        int
                constraint comidas_kcal_no_negativas
                check (kcal >= 0),

  constraint comidas_user_id_fecha_tiempo_unico unique (user_id, fecha, tiempo),
  -- Si vino de un menú, el nombre queda copiado aunque el menú se borre.
  constraint comidas_menu_con_nombre
    check (modo <> 'menu' or nombre_menu is not null)
);

comment on table public.comidas is
  'Una comida pendiente es la ausencia de fila. Completa = menu/manual, estimada = fuera.';
comment on column public.comidas.nombre_menu is
  'Copia del nombre del menú al registrar, para sobrevivir al borrado del menú.';


-- ----------------------------------------------------------------------------
-- alimentos — tabla de equivalencias por grupo
-- ----------------------------------------------------------------------------
create table if not exists public.alimentos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references auth.users on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  nombre        text not null,
  grupo         text not null
                  constraint alimentos_grupo_valido
                  check (grupo in (
                    'cereales', 'verduras', 'fruta', 'proteicos',
                    'lacteos', 'aceite', 'grasas'
                  )),
  medida_casera text not null,
  gramos        numeric,
  orden         int not null default 0
);


-- ----------------------------------------------------------------------------
-- medidas — peso y cintura. Se permiten varios registros por fecha.
-- ----------------------------------------------------------------------------
create table if not exists public.medidas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  fecha      date not null,
  peso       numeric,
  cintura    numeric,

  constraint medidas_algun_valor
    check (peso is not null or cintura is not null)
);


-- ----------------------------------------------------------------------------
-- inbody — mediciones de composición corporal
--
-- Dirección semántica de los deltas (la usan las pantallas, no la base):
--   bajar es bueno  -> peso, masa_grasa, pct_grasa, grasa_visceral
--   bajar es malo   -> masa_musculoesqueletica, masa_libre_grasa, agua_total
-- ----------------------------------------------------------------------------
create table if not exists public.inbody (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid()
                            references auth.users on delete cascade,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  fecha                   date not null,
  peso                    numeric,
  masa_grasa              numeric,
  pct_grasa               numeric,
  masa_musculoesqueletica numeric,
  masa_libre_grasa        numeric,
  grasa_visceral          numeric,
  agua_total              numeric,

  constraint inbody_algun_valor check (
    peso is not null
    or masa_grasa is not null
    or pct_grasa is not null
    or masa_musculoesqueletica is not null
    or masa_libre_grasa is not null
    or grasa_visceral is not null
    or agua_total is not null
  )
);


-- ----------------------------------------------------------------------------
-- hitos — etapas de la recuperación, con fecha planificada y fecha real
-- ----------------------------------------------------------------------------
create table if not exists public.hitos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  clave             text,
  nombre            text not null,
  fecha_planificada date,
  fecha_real        date,
  cumplido          boolean not null default false,
  fijo              boolean not null default false,
  historial         jsonb not null default '[]'
                      constraint hitos_historial_es_arreglo
                      check (jsonb_typeof(historial) = 'array'),

  constraint hitos_user_id_clave_unico unique (user_id, clave),
  -- cumplido y fecha_real no pueden contradecirse.
  constraint hitos_cumplido_con_fecha_real
    check (cumplido = (fecha_real is not null))
);

comment on column public.hitos.clave is
  'Identifica los hitos fijos predefinidos. Null en los que agrego yo.';
comment on column public.hitos.fecha_planificada is
  'Puede ser null: un hito puede no tener fecha todavía.';
comment on column public.hitos.historial is
  'Arreglo de {desde, hasta, motivo, fecha_cambio}, uno por cambio de fecha planificada.';


-- ----------------------------------------------------------------------------
-- entradas_recuperacion — línea de tiempo: controles, kinesiología y notas
-- ----------------------------------------------------------------------------
create table if not exists public.entradas_recuperacion (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  fecha           date not null,
  tipo            text not null
                    constraint entradas_recuperacion_tipo_valido
                    check (tipo in ('control', 'kine', 'nota')),
  numero_sesion   int
                    constraint entradas_recuperacion_numero_sesion_positivo
                    check (numero_sesion > 0),
  autorizado      text[] not null default '{}',
  hinchazon       text
                    constraint entradas_recuperacion_hinchazon_valida
                    check (hinchazon in ('menos', 'igual', 'mas')),
  indicaciones    text,
  nota            text,
  proximo_control date,

  -- Campos que solo tienen sentido en sesiones de kinesiología.
  constraint entradas_recuperacion_campos_de_kine
    check (tipo = 'kine' or (numero_sesion is null and hinchazon is null)),
  -- Campos que solo tienen sentido en controles médicos.
  constraint entradas_recuperacion_campos_de_control
    check (tipo = 'control' or (indicaciones is null and proximo_control is null))
);

comment on column public.entradas_recuperacion.indicaciones is 'Lo que indica la doctora.';
comment on column public.entradas_recuperacion.nota is 'Lo que anoto yo.';


-- ----------------------------------------------------------------------------
-- preguntas_control — lo que quiero preguntar en el próximo control
-- ----------------------------------------------------------------------------
create table if not exists public.preguntas_control (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  texto      text not null,
  preguntada boolean not null default false
);


-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
create index if not exists dias_user_id_fecha_idx
  on public.dias (user_id, fecha);
create index if not exists comidas_user_id_fecha_idx
  on public.comidas (user_id, fecha);
create index if not exists medidas_user_id_fecha_idx
  on public.medidas (user_id, fecha);
create index if not exists inbody_user_id_fecha_idx
  on public.inbody (user_id, fecha);
create index if not exists entradas_recuperacion_user_id_fecha_idx
  on public.entradas_recuperacion (user_id, fecha);
create index if not exists menus_user_id_tiempo_idx
  on public.menus (user_id, tiempo);
create index if not exists alimentos_user_id_grupo_idx
  on public.alimentos (user_id, grupo);


-- ----------------------------------------------------------------------------
-- Triggers de updated_at y RLS
--
-- Se aplica lo mismo a las 10 tablas desde un bucle, para que ninguna quede
-- sin trigger ni sin política por olvido.
--
-- Las políticas usan (select auth.uid()) y no auth.uid() a secas: así Postgres
-- evalúa la función una vez por consulta en vez de una vez por fila.
--
-- No hay ninguna política para el rol anon: sin sesión no se ve nada.
-- ----------------------------------------------------------------------------
do $bloque$
declare
  t text;
  accion text;
  tablas text[] := array[
    'configuracion', 'dias', 'menus', 'comidas', 'alimentos',
    'medidas', 'inbody', 'hitos', 'entradas_recuperacion', 'preguntas_control'
  ];
begin
  foreach t in array tablas loop
    execute format(
      'drop trigger if exists %I on public.%I',
      t || '_tocar_updated_at', t
    );
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.tocar_updated_at()',
      t || '_tocar_updated_at', t
    );

    execute format('alter table public.%I enable row level security', t);

    foreach accion in array array['select', 'insert', 'update', 'delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_' || accion, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = (select auth.uid()))',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))',
      t || '_delete', t
    );
  end loop;
end
$bloque$;

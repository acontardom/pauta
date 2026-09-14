-- ============================================================================
-- rutinas — las sesiones tipo del plan de entrenamiento
--
-- Cada fila es una sesión ("A · Empuje + core") de un bloque (el plan vigente).
-- Cambiar de plan es agregar un bloque nuevo por semilla y desactivar el
-- anterior: las filas viejas quedan como registro.
--
-- Lo que se marca en Hoy NO apunta a esta tabla: dias.entrenamiento guarda el
-- texto de la etiqueta ("Sesión A"). Desactivar o cambiar una rutina no toca
-- los días ya registrados.
-- ============================================================================


-- Valida la columna ejercicios: arreglo de objetos con nombre no vacío,
-- series entero > 0 y reps texto no vacío. orden, descanso_seg y notas son
-- opcionales.
--
-- Un solo CASE y no una cadena de AND/OR: el CASE evalúa sus ramas en orden,
-- así el cast a numeric solo corre cuando series ya se sabe que es un número,
-- y jsonb_array_elements solo cuando v ya se sabe que es un arreglo.
create or replace function public.ejercicios_validos(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $funcion$
  select case
    when jsonb_typeof(v) is distinct from 'array' then false
    else not exists (
      select 1 from jsonb_array_elements(v) e
      where case
        when jsonb_typeof(e.value) <> 'object' then true
        when jsonb_typeof(e.value -> 'nombre') is distinct from 'string' then true
        when btrim(e.value ->> 'nombre', E' \t\r\n') = '' then true
        when jsonb_typeof(e.value -> 'reps') is distinct from 'string' then true
        when btrim(e.value ->> 'reps', E' \t\r\n') = '' then true
        when jsonb_typeof(e.value -> 'series') is distinct from 'number' then true
        when (e.value ->> 'series')::numeric <= 0 then true
        when (e.value ->> 'series')::numeric
               <> trunc((e.value ->> 'series')::numeric) then true
        else false
      end
    )
  end;
$funcion$;

comment on function public.ejercicios_validos(jsonb) is
  'true si el jsonb es un arreglo de {nombre, series > 0 entero, reps} no vacíos.';


create table if not exists public.rutinas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
               references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  bloque     text not null,
  clave      text not null,
  nombre     text not null,
  orden      int not null default 0,
  activa     boolean not null default true,
  nota       text,
  ejercicios jsonb not null default '[]'
               constraint rutinas_ejercicios_validos
               check (public.ejercicios_validos(ejercicios)),

  constraint rutinas_user_id_bloque_clave_unico unique (user_id, bloque, clave)
);

comment on table public.rutinas is
  'Sesiones tipo del plan de entrenamiento. Solo lectura desde la app; se cargan por semilla.';
comment on column public.rutinas.bloque is
  'Nombre del plan. Cambiar de plan = bloque nuevo y desactivar el anterior.';
comment on column public.rutinas.nota is
  'Reglas del bloque: RIR, progresión, posición.';
comment on column public.rutinas.ejercicios is
  'Arreglo de {orden, nombre, series, reps, descanso_seg, notas}.';

create index if not exists rutinas_user_id_activa_idx
  on public.rutinas (user_id, activa);


-- ----------------------------------------------------------------------------
-- Trigger de updated_at y RLS, igual que las otras 10 tablas.
-- Sin ninguna política para anon.
-- ----------------------------------------------------------------------------
drop trigger if exists rutinas_tocar_updated_at on public.rutinas;
create trigger rutinas_tocar_updated_at
  before update on public.rutinas
  for each row execute function public.tocar_updated_at();

alter table public.rutinas enable row level security;

drop policy if exists rutinas_select on public.rutinas;
drop policy if exists rutinas_insert on public.rutinas;
drop policy if exists rutinas_update on public.rutinas;
drop policy if exists rutinas_delete on public.rutinas;

create policy rutinas_select on public.rutinas for select to authenticated
  using (user_id = (select auth.uid()));
create policy rutinas_insert on public.rutinas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy rutinas_update on public.rutinas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy rutinas_delete on public.rutinas for delete to authenticated
  using (user_id = (select auth.uid()));

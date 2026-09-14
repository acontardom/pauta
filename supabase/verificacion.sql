-- ============================================================================
-- Verificación del esquema. SOLO LECTURA: no modifica nada.
--
-- Se puede correr entero en el SQL Editor del dashboard de Supabase, o con:
--   npx supabase db execute --file supabase/verificacion.sql --linked
--
-- Qué esperar:
--   1. 11 tablas, todas con rls_activo = true
--   2. 44 políticas (4 por tabla), todas para el rol authenticated
--   3. ninguna política para anon
--   4. rutinas con su check rutinas_ejercicios_validos, su unique
--      (user_id, bloque, clave) y su índice (user_id, activa)
-- ============================================================================


-- 1. Tablas de public y estado de RLS. Todas deben salir en true.
select
  c.relname                        as tabla,
  c.relrowsecurity                 as rls_activo,
  c.relforcerowsecurity            as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;


-- 2. Políticas por tabla: acción, roles y expresiones.
select
  p.tablename                      as tabla,
  p.policyname                     as politica,
  p.cmd                            as accion,
  p.roles                          as roles,
  p.qual                           as using_expr,
  p.with_check                     as with_check_expr
from pg_policies p
where p.schemaname = 'public'
order by p.tablename, p.cmd, p.policyname;


-- 3. Resumen: cuántas políticas tiene cada tabla. Deben ser 4 en las 11.
select
  p.tablename                      as tabla,
  count(*)                         as politicas,
  string_agg(distinct p.cmd, ', ' order by p.cmd) as acciones
from pg_policies p
where p.schemaname = 'public'
group by p.tablename
order by p.tablename;


-- 4. Alerta: cualquier política que alcance al rol anon. Debe venir vacío.
select
  p.tablename as tabla,
  p.policyname as politica,
  p.roles as roles
from pg_policies p
where p.schemaname = 'public'
  and ('anon' = any (p.roles) or 'public' = any (p.roles))
order by p.tablename;


-- 5. Check constraints de todas las tablas, con su expresión.
select
  rel.relname                      as tabla,
  con.conname                      as restriccion,
  pg_get_constraintdef(con.oid)    as definicion
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and con.contype = 'c'
order by rel.relname, con.conname;


-- 6. Restricciones únicas, para confirmar las claves de negocio
--    (dias por fecha, comidas por fecha+tiempo, hitos por clave,
--    rutinas por bloque+clave...).
select
  rel.relname                      as tabla,
  con.conname                      as restriccion,
  pg_get_constraintdef(con.oid)    as definicion
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and con.contype = 'u'
order by rel.relname, con.conname;


-- 7. Índices creados a mano.
select
  tablename                        as tabla,
  indexname                        as indice,
  indexdef                         as definicion
from pg_indexes
where schemaname = 'public'
  and indexname like '%\_idx'
order by tablename, indexname;


-- 8. Triggers de updated_at. Debe haber uno por tabla.
select
  rel.relname                      as tabla,
  tg.tgname                        as trigger_nombre
from pg_trigger tg
join pg_class rel on rel.oid = tg.tgrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and not tg.tgisinternal
order by rel.relname, tg.tgname;


-- 9. Funciones de validación de columnas jsonb. Deben ser inmutables ('i').
--    ejercicios_validos es la del check de rutinas.ejercicios.
select
  p.proname                        as funcion,
  p.provolatile                    as volatilidad,
  pg_get_function_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('porciones_validas', 'horarios_validos', 'ejercicios_validos')
order by p.proname;

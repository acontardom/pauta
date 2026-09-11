-- ============================================================================
-- Quita grasa_visceral de inbody.
--
-- Decisión de producto: ese valor no se registra. El diseño de referencia
-- todavía lo muestra; hay que ignorarlo, la columna ya no existe.
--
-- El orden importa: el check inbody_algun_valor nombra la columna, así que no
-- se puede borrar la columna antes que el check.
-- ============================================================================

-- 1. Fuera el check que exige al menos un valor no nulo.
alter table public.inbody
  drop constraint if exists inbody_algun_valor;

-- 2. Fuera la columna.
alter table public.inbody
  drop column if exists grasa_visceral;

-- 3. El mismo check, ahora sobre las seis columnas que quedan.
alter table public.inbody
  add constraint inbody_algun_valor check (
    peso is not null
    or masa_grasa is not null
    or pct_grasa is not null
    or masa_musculoesqueletica is not null
    or masa_libre_grasa is not null
    or agua_total is not null
  );

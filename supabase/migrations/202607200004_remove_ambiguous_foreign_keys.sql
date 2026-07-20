begin;

-- Las relaciones compuestas agregadas por la migracion de seguridad validan
-- simultaneamente el recurso y su tenant. Las FK simples son redundantes y
-- hacen que PostgREST no pueda elegir una relacion para los embeds.
alter table public.citas
  drop constraint if exists citas_barbero_id_fkey,
  drop constraint if exists citas_servicio_id_fkey;

alter table public.ganancias
  drop constraint if exists ganancias_barbero_id_fkey,
  drop constraint if exists ganancias_cita_id_fkey;

commit;

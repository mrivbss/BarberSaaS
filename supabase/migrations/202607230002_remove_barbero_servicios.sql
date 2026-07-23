begin;

drop table if exists public.barbero_servicios;

commit;

notify pgrst, 'reload schema';
begin;

-- Una cita solo puede originar un ingreso. El índice también protege frente a
-- dos solicitudes concurrentes que intenten cobrar la misma cita.
create unique index if not exists ganancias_cita_id_uidx
  on public.ganancias (cita_id)
  where cita_id is not null;

create or replace function public.cobrar_cita_barbero(p_cita_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_id uuid := (select auth.uid());
  v_cita public.citas%rowtype;
  v_servicio record;
  v_ganancia public.ganancias%rowtype;
begin
  if v_auth_id is null then
    return jsonb_build_object('status', 'no_autenticado');
  end if;

  -- El bloqueo mantiene serializados los cobros concurrentes de la misma cita.
  select c.*
  into v_cita
  from public.citas c
  where c.id = p_cita_id
  for update;

  if not found then
    return jsonb_build_object('status', 'cita_no_encontrada');
  end if;

  if v_cita.barbero_id is distinct from v_auth_id then
    return jsonb_build_object('status', 'cita_no_pertenece_al_barbero');
  end if;

  if not exists (
    select 1
    from public.usuarios u
    join public.barberias b on b.id = u.barberia_id
    where u.id = v_auth_id
      and u.barberia_id = v_cita.barberia_id
      and u.rol = 'barbero'
      and u.activo
      and b.activo
  ) then
    return jsonb_build_object('status', 'barbero_no_disponible');
  end if;

  if lower(coalesce(v_cita.estado, 'pendiente')) in ('cobrada', 'completada') then
    return jsonb_build_object('status', 'cita_ya_cobrada');
  end if;

  if exists (
    select 1
    from public.ganancias g
    where g.cita_id = v_cita.id
  ) then
    return jsonb_build_object('status', 'cita_ya_cobrada');
  end if;

  select s.id, s.nombre, s.precio
  into v_servicio
  from public.servicios s
  where s.id = v_cita.servicio_id
    and s.barbero_id = v_cita.barbero_id
    and s.barberia_id = v_cita.barberia_id
  limit 1
  for share;

  if not found then
    return jsonb_build_object('status', 'servicio_invalido');
  end if;

  if v_servicio.precio is null or v_servicio.precio <= 0 then
    return jsonb_build_object('status', 'servicio_invalido');
  end if;

  insert into public.ganancias (
    cita_id,
    barberia_id,
    barbero_id,
    monto,
    concepto
  ) values (
    v_cita.id,
    v_cita.barberia_id,
    v_auth_id,
    v_servicio.precio,
    format('Cita: %s - %s', v_servicio.nombre, v_cita.cliente)
  )
  on conflict (cita_id) where cita_id is not null do nothing
  returning * into v_ganancia;

  if v_ganancia.id is null then
    return jsonb_build_object('status', 'cita_ya_cobrada');
  end if;

  update public.citas
  set estado = 'cobrada'
  where id = v_cita.id
  returning * into v_cita;

  return jsonb_build_object(
    'status', 'ok',
    'cita_id', v_cita.id,
    'ganancia_id', v_ganancia.id,
    'monto', v_ganancia.monto,
    'estado', v_cita.estado,
    'ganancia', to_jsonb(v_ganancia),
    'cita', to_jsonb(v_cita)
  );
end;
$$;

revoke all on function public.cobrar_cita_barbero(uuid) from public, anon, authenticated;
grant execute on function public.cobrar_cita_barbero(uuid) to authenticated;

comment on function public.cobrar_cita_barbero(uuid) is
  'Cobra atómicamente una cita del barbero autenticado y registra exactamente una ganancia asociada.';

commit;

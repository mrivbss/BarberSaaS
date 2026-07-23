begin;

-- Toda reserva publica pertenece a un barbero concreto. La firma y los
-- estados existentes se conservan para mantener compatible el frontend.
create or replace function public.crear_cita_publica(
  p_barberia_slug text,
  p_barbero_slug text,
  p_servicio_id bigint,
  p_cliente text,
  p_fecha date,
  p_hora time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barberia public.barberias%rowtype;
  v_barbero_id uuid;
  v_barbero_activo boolean;
  v_cita_id uuid;
begin
  if p_cliente is null
    or pg_catalog.char_length(pg_catalog.btrim(p_cliente)) < 2
    or pg_catalog.char_length(pg_catalog.btrim(p_cliente)) > 120
  then
    return pg_catalog.jsonb_build_object('status', 'cliente_invalido');
  end if;

  if p_fecha is null
    or not pg_catalog.isfinite(p_fecha)
    or p_fecha < current_date
    or p_hora is null
    or p_hora >= time '24:00'
  then
    return pg_catalog.jsonb_build_object('status', 'fecha_hora_invalida');
  end if;

  if p_barbero_slug is null or pg_catalog.btrim(p_barbero_slug) = '' then
    return pg_catalog.jsonb_build_object('status', 'barbero_no_disponible');
  end if;

  select b.*
  into v_barberia
  from public.barberias b
  where b.slug = p_barberia_slug
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'barberia_no_encontrada');
  end if;

  if not v_barberia.activo then
    return pg_catalog.jsonb_build_object('status', 'barberia_inactiva');
  end if;

  -- Resolver dentro del tenant evita revelar si el mismo slug existe en otra
  -- barberia y rechaza tanto barberos inexistentes como ajenos.
  select u.id, u.activo
  into v_barbero_id, v_barbero_activo
  from public.usuarios u
  where u.slug = p_barbero_slug
    and u.barberia_id = v_barberia.id
    and u.rol = 'barbero'
  limit 1;

  if not found or not coalesce(v_barbero_activo, false) then
    return pg_catalog.jsonb_build_object('status', 'barbero_no_disponible');
  end if;

  -- El servicio debe existir y pertenecer simultaneamente al tenant y al
  -- barbero seleccionado; ya no se consulta barbero_servicios.
  if not exists (
    select 1
    from public.servicios s
    where s.id = p_servicio_id
      and s.barberia_id = v_barberia.id
      and s.barbero_id = v_barbero_id
  ) then
    return pg_catalog.jsonb_build_object('status', 'servicio_invalido');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      v_barbero_id::text || ':' || p_fecha::text || ':' || p_hora::text
    )
  );

  if exists (
    select 1
    from public.citas c
    where c.barberia_id = v_barberia.id
      and c.barbero_id = v_barbero_id
      and c.fecha = p_fecha
      and c.hora = p_hora
      and pg_catalog.lower(coalesce(c.estado, 'pendiente')) <> 'cancelada'
  ) then
    return pg_catalog.jsonb_build_object('status', 'horario_no_disponible');
  end if;

  insert into public.citas (
    cliente,
    fecha,
    hora,
    barbero_id,
    barberia_id,
    servicio_id,
    estado
  ) values (
    pg_catalog.btrim(p_cliente),
    p_fecha,
    p_hora,
    v_barbero_id,
    v_barberia.id,
    p_servicio_id,
    'pendiente'
  )
  returning id into v_cita_id;

  return pg_catalog.jsonb_build_object(
    'status', 'ok',
    'cita_id', v_cita_id
  );
end;
$$;

revoke all on function public.crear_cita_publica(text, text, bigint, text, date, time)
  from public, anon, authenticated;
grant execute on function public.crear_cita_publica(text, text, bigint, text, date, time)
  to anon, authenticated;

comment on function public.crear_cita_publica(text, text, bigint, text, date, time) is
  'Crea una reserva publica para un barbero obligatorio y valida que el servicio pertenezca al mismo barbero y tenant.';

commit;

begin;

-- Evita acceder a un RECORD no inicializado cuando el portal se abre sin
-- p_barbero_slug. La variante individual mantiene la resolucion estricta por
-- barberia_id + slug + rol.
create or replace function public.obtener_portal_publico(
  p_barberia_slug text,
  p_barbero_slug text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_barberia public.barberias%rowtype;
  v_barbero jsonb := null;
  v_servicios jsonb;
begin
  select * into v_barberia
  from public.barberias
  where slug = p_barberia_slug
  limit 1;

  if not found then
    return jsonb_build_object('status', 'barberia_no_encontrada');
  end if;

  if not v_barberia.activo then
    return jsonb_build_object('status', 'barberia_inactiva');
  end if;

  if p_barbero_slug is not null and btrim(p_barbero_slug) <> '' then
    select jsonb_build_object('nombre', u.nombre, 'slug', u.slug)
    into v_barbero
    from public.usuarios u
    where u.barberia_id = v_barberia.id
      and u.slug = p_barbero_slug
      and u.rol = 'barbero'
      and u.activo
    limit 1;

    if not found then
      return jsonb_build_object('status', 'barbero_no_encontrado');
    end if;

  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'nombre', s.nombre,
        'precio', s.precio,
        'duracion', s.duracion
      ) order by s.nombre
    ),
    '[]'::jsonb
  )
  into v_servicios
  from public.servicios s
  where s.barberia_id = v_barberia.id;

  return jsonb_build_object(
    'status', 'ok',
    'barberia', jsonb_build_object(
      'nombre', v_barberia.nombre,
      'comuna', v_barberia.comuna,
      'slug', v_barberia.slug
    ),
    'barbero', v_barbero,
    'servicios', v_servicios
  );
end;
$$;

revoke all on function public.obtener_portal_publico(text, text) from public, anon, authenticated;
grant execute on function public.obtener_portal_publico(text, text) to anon, authenticated;

-- Las cuentas heredadas ya fueron creadas y verificadas en Supabase Auth.
-- El perfil publico no debe conservar credenciales en texto plano.
alter table public.usuarios drop column if exists password;

commit;

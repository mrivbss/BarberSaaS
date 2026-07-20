begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.normalizar_slug(valor text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(
      lower(coalesce(valor, '')),
      'áéíóúüñàèìòùäëïöüç',
      'aeiouunaeiouaeiouc'
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

alter table public.barberias
  add column if not exists slug text,
  add column if not exists activo boolean not null default true,
  add column if not exists actualizado_en timestamptz not null default now();

alter table public.usuarios
  add column if not exists nombre text,
  add column if not exists slug text,
  add column if not exists activo boolean not null default true,
  add column if not exists actualizado_en timestamptz not null default now();

alter table public.servicios
  add column if not exists barberia_id uuid references public.barberias(id);

-- La ruta pública general no elige barbero. Se conserva la nulabilidad real
-- observada en producción y los IDs sólo se resuelven dentro de la RPC segura.
alter table public.citas alter column barbero_id drop not null;

-- Los superadmins son usuarios de plataforma y no pertenecen a un tenant.
alter table public.usuarios alter column barberia_id drop not null;

-- Los perfiles existentes reciben un nombre legible sin tocar credenciales.
update public.usuarios
set nombre = initcap(replace(split_part(email, '@', 1), '.', ' '))
where nombre is null or btrim(nombre) = '';

alter table public.usuarios alter column nombre set not null;

-- Si este esquema se aplica sobre una instalación antigua con una sola
-- barbería, sus servicios históricos se pueden asociar sin ambigüedad.
update public.servicios
set barberia_id = (select id from public.barberias order by id limit 1)
where barberia_id is null
  and (select count(*) from public.barberias) = 1;

do $$
begin
  if exists (select 1 from public.servicios where barberia_id is null) then
    raise exception 'Hay servicios sin barberia_id. Asígnelos antes de aplicar esta migración.';
  end if;
end
$$;

alter table public.servicios alter column barberia_id set not null;

-- Normalización y resolución determinista de colisiones existentes.
do $$
declare
  fila record;
  base text;
  candidato text;
  sufijo integer;
begin
  for fila in
    select id, nombre, slug
    from public.barberias
    order by creado_en nulls last, id
  loop
    base := private.normalizar_slug(coalesce(nullif(btrim(fila.slug), ''), fila.nombre));
    if base = '' then
      base := 'barberia';
    end if;

    candidato := base;
    sufijo := 2;
    while exists (
      select 1 from public.barberias
      where id <> fila.id and slug = candidato
    ) loop
      candidato := base || '-' || sufijo;
      sufijo := sufijo + 1;
    end loop;

    update public.barberias set slug = candidato where id = fila.id;
  end loop;
end
$$;

do $$
declare
  fila record;
  base text;
  candidato text;
  sufijo integer;
begin
  for fila in
    select id, barberia_id, nombre, email, slug
    from public.usuarios
    where rol = 'barbero'
    order by creado_en nulls last, id
  loop
    base := private.normalizar_slug(
      coalesce(nullif(btrim(fila.slug), ''), nullif(btrim(fila.nombre), ''), split_part(fila.email, '@', 1))
    );
    if base = '' then
      base := 'barbero';
    end if;

    candidato := base;
    sufijo := 2;
    while exists (
      select 1 from public.usuarios
      where id <> fila.id
        and barberia_id = fila.barberia_id
        and rol = 'barbero'
        and slug = candidato
    ) loop
      candidato := base || '-' || sufijo;
      sufijo := sufijo + 1;
    end loop;

    update public.usuarios set slug = candidato where id = fila.id;
  end loop;
end
$$;

-- Los slugs de usuario sólo tienen semántica pública para barberos.
update public.usuarios set slug = null where rol <> 'barbero';

alter table public.barberias alter column slug set not null;

alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios drop constraint if exists usuarios_rol_barberia_check;
alter table public.usuarios drop constraint if exists usuarios_slug_formato_check;
alter table public.usuarios drop constraint if exists usuarios_barbero_slug_requerido_check;
alter table public.barberias drop constraint if exists barberias_slug_formato_check;

alter table public.usuarios
  add constraint usuarios_rol_barberia_check check (
    (rol = 'superadmin' and barberia_id is null)
    or
    (rol in ('admin', 'barbero') and barberia_id is not null)
  ),
  add constraint usuarios_slug_formato_check check (
    slug is null or (
      char_length(slug) <= 120
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  add constraint usuarios_barbero_slug_requerido_check check (
    rol <> 'barbero' or slug is not null
  );

alter table public.barberias
  add constraint barberias_slug_formato_check check (
    char_length(slug) <= 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

create unique index if not exists barberias_slug_uidx
  on public.barberias (slug);
create unique index if not exists usuarios_email_lower_uidx
  on public.usuarios (lower(email));
create unique index if not exists usuarios_barbero_slug_uidx
  on public.usuarios (barberia_id, slug)
  where rol = 'barbero' and slug is not null;
create unique index if not exists usuarios_admin_activo_uidx
  on public.usuarios (barberia_id)
  where rol = 'admin' and activo;
create unique index if not exists usuarios_unico_superadmin_uidx
  on public.usuarios (rol)
  where rol = 'superadmin';

create index if not exists usuarios_barberia_rol_activo_idx
  on public.usuarios (barberia_id, rol, activo);
create index if not exists servicios_barberia_idx
  on public.servicios (barberia_id);
create index if not exists citas_barberia_fecha_hora_idx
  on public.citas (barberia_id, fecha, hora);
create index if not exists citas_barbero_fecha_hora_idx
  on public.citas (barbero_id, fecha, hora);
create index if not exists ganancias_barberia_creado_idx
  on public.ganancias (barberia_id, creado_en);
create index if not exists ganancias_barbero_creado_idx
  on public.ganancias (barbero_id, creado_en);

-- Las claves compuestas impiden mezclar IDs válidos de tenants distintos.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'servicios_barberia_id_fkey'
      and conrelid = 'public.servicios'::regclass
  ) then
    alter table public.servicios
      add constraint servicios_barberia_id_fkey
      foreign key (barberia_id) references public.barberias(id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'usuarios_id_barberia_key'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_id_barberia_key unique (id, barberia_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'servicios_id_barberia_key'
      and conrelid = 'public.servicios'::regclass
  ) then
    alter table public.servicios
      add constraint servicios_id_barberia_key unique (id, barberia_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'citas_id_barberia_key'
      and conrelid = 'public.citas'::regclass
  ) then
    alter table public.citas
      add constraint citas_id_barberia_key unique (id, barberia_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'usuarios_auth_user_fkey'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_auth_user_fkey
      foreign key (id) references auth.users(id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'citas_barbero_tenant_fkey'
      and conrelid = 'public.citas'::regclass
  ) then
    alter table public.citas
      add constraint citas_barbero_tenant_fkey
      foreign key (barbero_id, barberia_id)
      references public.usuarios(id, barberia_id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'citas_servicio_tenant_fkey'
      and conrelid = 'public.citas'::regclass
  ) then
    alter table public.citas
      add constraint citas_servicio_tenant_fkey
      foreign key (servicio_id, barberia_id)
      references public.servicios(id, barberia_id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ganancias_barbero_tenant_fkey'
      and conrelid = 'public.ganancias'::regclass
  ) then
    alter table public.ganancias
      add constraint ganancias_barbero_tenant_fkey
      foreign key (barbero_id, barberia_id)
      references public.usuarios(id, barberia_id) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ganancias_cita_tenant_fkey'
      and conrelid = 'public.ganancias'::regclass
  ) then
    alter table public.ganancias
      add constraint ganancias_cita_tenant_fkey
      foreign key (cita_id, barberia_id)
      references public.citas(id, barberia_id) not valid;
  end if;
end
$$;

alter table public.servicios validate constraint servicios_barberia_id_fkey;
alter table public.usuarios validate constraint usuarios_auth_user_fkey;
alter table public.citas validate constraint citas_barbero_tenant_fkey;
alter table public.citas validate constraint citas_servicio_tenant_fkey;
alter table public.ganancias validate constraint ganancias_barbero_tenant_fkey;
alter table public.ganancias validate constraint ganancias_cita_tenant_fkey;

-- La columna heredada se conserva durante la transición, pero deja de ser
-- obligatoria y más adelante no tendrá privilegios de lectura vía API.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios'
      and column_name = 'password'
  ) then
    alter table public.usuarios alter column password drop not null;
  end if;
end
$$;

create or replace function private.marcar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

revoke all on function private.normalizar_slug(text) from public, anon, authenticated;
revoke all on function private.marcar_actualizado_en() from public, anon, authenticated;

drop trigger if exists barberias_actualizado_en_trigger on public.barberias;
create trigger barberias_actualizado_en_trigger
before update on public.barberias
for each row execute function private.marcar_actualizado_en();

drop trigger if exists usuarios_actualizado_en_trigger on public.usuarios;
create trigger usuarios_actualizado_en_trigger
before update on public.usuarios
for each row execute function private.marcar_actualizado_en();

create or replace function private.es_superadmin_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = (select auth.uid())
      and u.rol = 'superadmin'
      and u.activo
  );
$$;

create or replace function private.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol
  from public.usuarios u
  left join public.barberias b on b.id = u.barberia_id
  where u.id = (select auth.uid())
    and u.activo
    and (u.rol = 'superadmin' or b.activo)
  limit 1;
$$;

create or replace function private.tenant_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.barberia_id
  from public.usuarios u
  join public.barberias b on b.id = u.barberia_id
  where u.id = (select auth.uid())
    and u.activo
    and b.activo
  limit 1;
$$;

create or replace function private.usuario_activo_en_tenant(usuario_id uuid, tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.barberias b on b.id = u.barberia_id
    where u.id = usuario_id
      and u.barberia_id = tenant_id
      and u.rol in ('admin', 'barbero')
      and u.activo
      and b.activo
  );
$$;

revoke all on function private.es_superadmin_activo() from public;
revoke all on function private.rol_actual() from public;
revoke all on function private.tenant_actual() from public;
revoke all on function private.usuario_activo_en_tenant(uuid, uuid) from public;
grant execute on function private.es_superadmin_activo() to authenticated;
grant execute on function private.rol_actual() to authenticated;
grant execute on function private.tenant_actual() to authenticated;
grant execute on function private.usuario_activo_en_tenant(uuid, uuid) to authenticated;

create or replace function public.obtener_mi_perfil()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'nombre', u.nombre,
    'rol', u.rol,
    'barberia_id', u.barberia_id,
    'slug', u.slug,
    'activo', u.activo,
    'barberia_activa', coalesce(b.activo, true)
  )
  from public.usuarios u
  left join public.barberias b on b.id = u.barberia_id
  where u.id = (select auth.uid())
  limit 1;
$$;

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
  v_barbero record;
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
    select u.id, u.nombre, u.slug, u.activo
    into v_barbero
    from public.usuarios u
    where u.barberia_id = v_barberia.id
      and u.slug = p_barbero_slug
      and u.rol = 'barbero'
    limit 1;

    if not found then
      return jsonb_build_object('status', 'barbero_no_encontrado');
    end if;

    if not v_barbero.activo then
      return jsonb_build_object('status', 'barbero_inactivo');
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
    'barbero', case
      when p_barbero_slug is null or btrim(p_barbero_slug) = '' then null
      else jsonb_build_object('nombre', v_barbero.nombre, 'slug', v_barbero.slug)
    end,
    'servicios', v_servicios
  );
end;
$$;

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
  v_cita_id uuid;
begin
  if p_cliente is null or char_length(btrim(p_cliente)) < 2 or char_length(btrim(p_cliente)) > 120 then
    return jsonb_build_object('status', 'cliente_invalido');
  end if;

  if p_fecha is null or p_fecha < current_date or p_hora is null then
    return jsonb_build_object('status', 'fecha_hora_invalida');
  end if;

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

  if not exists (
    select 1 from public.servicios s
    where s.id = p_servicio_id and s.barberia_id = v_barberia.id
  ) then
    return jsonb_build_object('status', 'servicio_invalido');
  end if;

  if p_barbero_slug is not null and btrim(p_barbero_slug) <> '' then
    select u.id into v_barbero_id
    from public.usuarios u
    where u.barberia_id = v_barberia.id
      and u.slug = p_barbero_slug
      and u.rol = 'barbero'
      and u.activo
    limit 1;

    if v_barbero_id is null then
      return jsonb_build_object('status', 'barbero_no_disponible');
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      coalesce(v_barbero_id::text, v_barberia.id::text) || ':' || p_fecha::text || ':' || p_hora::text
    )
  );

  if v_barbero_id is not null and exists (
    select 1 from public.citas c
    where c.barberia_id = v_barberia.id
      and c.barbero_id = v_barbero_id
      and c.fecha = p_fecha
      and c.hora = p_hora
      and lower(coalesce(c.estado, 'pendiente')) <> 'cancelada'
  ) then
    return jsonb_build_object('status', 'horario_no_disponible');
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
    btrim(p_cliente),
    p_fecha,
    p_hora,
    v_barbero_id,
    v_barberia.id,
    p_servicio_id,
    'pendiente'
  ) returning id into v_cita_id;

  return jsonb_build_object('status', 'ok', 'cita_id', v_cita_id);
end;
$$;

revoke all on function public.obtener_mi_perfil() from public, anon, authenticated;
revoke all on function public.obtener_portal_publico(text, text) from public, anon, authenticated;
revoke all on function public.crear_cita_publica(text, text, bigint, text, date, time) from public, anon, authenticated;
grant execute on function public.obtener_mi_perfil() to authenticated;
grant execute on function public.obtener_portal_publico(text, text) to anon, authenticated;
grant execute on function public.crear_cita_publica(text, text, bigint, text, date, time) to anon, authenticated;

-- Elimina cualquier política histórica permisiva antes de instalar la matriz.
do $$
declare
  politica record;
begin
  for politica in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('barberias', 'usuarios', 'servicios', 'citas', 'ganancias', 'barbero_servicios')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      politica.policyname,
      politica.schemaname,
      politica.tablename
    );
  end loop;
end
$$;

alter table public.barberias enable row level security;
alter table public.usuarios enable row level security;
alter table public.servicios enable row level security;
alter table public.citas enable row level security;
alter table public.ganancias enable row level security;

create policy barberias_lectura_autenticada
on public.barberias for select to authenticated
using (
  (select private.es_superadmin_activo())
  or id = (select private.tenant_actual())
);

create policy usuarios_lectura_autenticada
on public.usuarios for select to authenticated
using (
  (select private.es_superadmin_activo())
  or id = (select auth.uid())
  or (
    (select private.rol_actual()) = 'admin'
    and barberia_id = (select private.tenant_actual())
  )
);

create policy servicios_lectura_tenant
on public.servicios for select to authenticated
using (
  (select private.es_superadmin_activo())
  or barberia_id = (select private.tenant_actual())
);

create policy servicios_insert_admin
on public.servicios for insert to authenticated
with check (
  (select private.rol_actual()) = 'admin'
  and barberia_id = (select private.tenant_actual())
);

create policy servicios_update_admin
on public.servicios for update to authenticated
using (
  (select private.rol_actual()) = 'admin'
  and barberia_id = (select private.tenant_actual())
)
with check (
  (select private.rol_actual()) = 'admin'
  and barberia_id = (select private.tenant_actual())
);

create policy servicios_delete_admin
on public.servicios for delete to authenticated
using (
  (select private.rol_actual()) = 'admin'
  and barberia_id = (select private.tenant_actual())
);

create policy citas_lectura_tenant
on public.citas for select to authenticated
using (
  (select private.es_superadmin_activo())
  or (
    barberia_id = (select private.tenant_actual())
    and (
      (select private.rol_actual()) = 'admin'
      or barbero_id = (select auth.uid())
    )
  )
);

create policy citas_insert_tenant
on public.citas for insert to authenticated
with check (
  barberia_id = (select private.tenant_actual())
  and (
    (
      (select private.rol_actual()) = 'admin'
      and (select private.usuario_activo_en_tenant(barbero_id, barberia_id))
    )
    or (
      (select private.rol_actual()) = 'barbero'
      and barbero_id = (select auth.uid())
    )
  )
);

create policy citas_update_tenant
on public.citas for update to authenticated
using (
  barberia_id = (select private.tenant_actual())
  and (
    (select private.rol_actual()) = 'admin'
    or barbero_id = (select auth.uid())
  )
)
with check (
  barberia_id = (select private.tenant_actual())
  and (
    (
      (select private.rol_actual()) = 'admin'
      and (
        barbero_id is null
        or (select private.usuario_activo_en_tenant(barbero_id, barberia_id))
      )
    )
    or (
      (select private.rol_actual()) = 'barbero'
      and barbero_id = (select auth.uid())
    )
  )
);

create policy citas_delete_tenant
on public.citas for delete to authenticated
using (
  barberia_id = (select private.tenant_actual())
  and (
    (select private.rol_actual()) = 'admin'
    or barbero_id = (select auth.uid())
  )
);

create policy ganancias_lectura_tenant
on public.ganancias for select to authenticated
using (
  (select private.es_superadmin_activo())
  or (
    barberia_id = (select private.tenant_actual())
    and (
      (select private.rol_actual()) = 'admin'
      or barbero_id = (select auth.uid())
    )
  )
);

create policy ganancias_insert_tenant
on public.ganancias for insert to authenticated
with check (
  barberia_id = (select private.tenant_actual())
  and (
    (
      (select private.rol_actual()) = 'admin'
      and (select private.usuario_activo_en_tenant(barbero_id, barberia_id))
    )
    or (
      (select private.rol_actual()) = 'barbero'
      and barbero_id = (select auth.uid())
    )
  )
);

-- Seguridad condicional para la tabla opcional ya desplegada.
do $$
begin
  if to_regclass('public.barbero_servicios') is not null then
    execute 'alter table public.barbero_servicios enable row level security';
    execute 'create index if not exists barbero_servicios_barberia_idx on public.barbero_servicios (barberia_id)';
    execute 'create index if not exists barbero_servicios_barbero_idx on public.barbero_servicios (barbero_id)';
    execute 'create index if not exists barbero_servicios_servicio_idx on public.barbero_servicios (servicio_id)';

    if not exists (
      select 1 from pg_constraint
      where conname = 'barbero_servicios_barbero_tenant_fkey'
        and conrelid = 'public.barbero_servicios'::regclass
    ) then
      execute 'alter table public.barbero_servicios add constraint barbero_servicios_barbero_tenant_fkey foreign key (barbero_id, barberia_id) references public.usuarios(id, barberia_id) not valid';
      execute 'alter table public.barbero_servicios validate constraint barbero_servicios_barbero_tenant_fkey';
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'barbero_servicios_servicio_tenant_fkey'
        and conrelid = 'public.barbero_servicios'::regclass
    ) then
      execute 'alter table public.barbero_servicios add constraint barbero_servicios_servicio_tenant_fkey foreign key (servicio_id, barberia_id) references public.servicios(id, barberia_id) not valid';
      execute 'alter table public.barbero_servicios validate constraint barbero_servicios_servicio_tenant_fkey';
    end if;

    execute 'create policy barbero_servicios_lectura_tenant on public.barbero_servicios for select to authenticated using ((select private.es_superadmin_activo()) or (barberia_id = (select private.tenant_actual()) and ((select private.rol_actual()) = ''admin'' or barbero_id = (select auth.uid()))))';
    execute 'create policy barbero_servicios_insert_admin on public.barbero_servicios for insert to authenticated with check ((select private.rol_actual()) = ''admin'' and barberia_id = (select private.tenant_actual()))';
    execute 'create policy barbero_servicios_update_admin on public.barbero_servicios for update to authenticated using ((select private.rol_actual()) = ''admin'' and barberia_id = (select private.tenant_actual())) with check ((select private.rol_actual()) = ''admin'' and barberia_id = (select private.tenant_actual()))';
    execute 'create policy barbero_servicios_delete_admin on public.barbero_servicios for delete to authenticated using ((select private.rol_actual()) = ''admin'' and barberia_id = (select private.tenant_actual()))';
  end if;
end
$$;

-- Mínimo privilegio: los anónimos sólo ejecutan las dos RPC públicas.
revoke all on public.barberias, public.usuarios, public.servicios, public.citas, public.ganancias from public, anon, authenticated;
grant select on public.barberias, public.servicios, public.citas, public.ganancias to authenticated;
grant select (id, nombre, email, rol, barberia_id, slug, activo, creado_en, actualizado_en)
  on public.usuarios to authenticated;
grant insert, update, delete on public.servicios, public.citas to authenticated;
grant insert on public.ganancias to authenticated;

do $$
begin
  if to_regclass('public.barbero_servicios') is not null then
    execute 'revoke all on public.barbero_servicios from public, anon, authenticated';
    execute 'grant select, insert, update, delete on public.barbero_servicios to authenticated';
    execute 'grant all on public.barbero_servicios to service_role';
  end if;
end
$$;

grant all on public.barberias, public.usuarios, public.servicios, public.citas, public.ganancias to service_role;

revoke all on all sequences in schema public from public, anon, authenticated;

do $$
begin
  if to_regclass('public.servicios_id_seq') is not null then
    execute 'grant usage, select on sequence public.servicios_id_seq to authenticated, service_role';
  end if;

  if to_regclass('public.barbero_servicios_id_seq') is not null then
    execute 'grant usage, select on sequence public.barbero_servicios_id_seq to authenticated, service_role';
  end if;
end
$$;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios'
      and column_name = 'password'
  ) then
    execute 'comment on column public.usuarios.password is ''LEGACY: no usar en flujos nuevos. Las contraseñas se gestionan exclusivamente en Supabase Auth.''';
  end if;
end
$$;
comment on function public.obtener_portal_publico(text, text) is
  'Superficie pública mínima para resolver barbería, barbero y servicios activos sin exponer usuarios.';
comment on function public.crear_cita_publica(text, text, bigint, text, date, time) is
  'Crea una reserva pública derivando los UUID internos desde slugs validados.';

commit;

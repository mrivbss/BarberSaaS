import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2';

type JsonRecord = Record<string, unknown>;
type TenantRole = 'admin' | 'barbero';
type InvitationDelivery = 'email' | 'link';

interface BarberiaRow {
  id: string;
  nombre: string;
  comuna: string;
  slug: string;
  activo: boolean;
  creado_en: string | null;
  actualizado_en: string | null;
}

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | TenantRole;
  barberia_id: string | null;
  slug: string | null;
  activo: boolean;
  creado_en: string | null;
  actualizado_en: string | null;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'invalid_request', 'La solicitud no tiene un formato válido.');
  }
  return value as JsonRecord;
}

function requiredString(
  body: JsonRecord,
  key: string,
  label: string,
  maxLength: number,
): string {
  const value = body[key];
  if (typeof value !== 'string') {
    throw new ApiError(400, 'invalid_input', `${label} es obligatorio.`);
  }

  const cleanValue = value.trim();
  if (!cleanValue || cleanValue.length > maxLength) {
    throw new ApiError(400, 'invalid_input', `${label} no es válido.`);
  }
  return cleanValue;
}

function requiredUuid(body: JsonRecord, key: string): string {
  const value = requiredString(body, key, 'La barbería', 64);
  if (!uuidPattern.test(value)) {
    throw new ApiError(400, 'invalid_barberia', 'La barbería no es válida.');
  }
  return value;
}

function optionalSlug(body: JsonRecord, key: string): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'invalid_slug', 'El slug no es válido.');
  }

  const cleanValue = value.trim();
  if (cleanValue.length > 120 || !slugPattern.test(cleanValue)) {
    throw new ApiError(
      400,
      'invalid_slug',
      'El slug sólo puede contener letras minúsculas, números y guiones.',
    );
  }
  return cleanValue;
}

function requestedBoolean(body: JsonRecord, key: string): boolean {
  if (typeof body[key] !== 'boolean') {
    throw new ApiError(400, 'invalid_input', 'El estado solicitado no es válido.');
  }
  return body[key] as boolean;
}

function invitationDelivery(body: JsonRecord): InvitationDelivery {
  const value = body.delivery ?? 'email';
  if (value !== 'email' && value !== 'link') {
    throw new ApiError(400, 'invalid_delivery', 'El método de invitación no es válido.');
  }
  return value;
}

function responseHeaders(request: Request): { allowed: boolean; headers: HeadersInit } {
  const requestOrigin = request.headers.get('origin');
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowed = !requestOrigin
    || configuredOrigins.includes(requestOrigin);

  return {
    allowed,
    headers: {
      'Access-Control-Allow-Origin': allowed && requestOrigin ? requestOrigin : 'null',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8',
    },
  };
}

function getPublicAppUrl(): string {
  const configuredUrl = Deno.env.get('PUBLIC_APP_URL')?.trim();
  if (!configuredUrl) {
    throw new ApiError(500, 'server_configuration', 'La URL pública de invitaciones no está configurada.');
  }

  try {
    const url = new URL(configuredUrl);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) {
      throw new Error('invalid public URL');
    }
    return url.origin;
  } catch {
    throw new ApiError(500, 'server_configuration', 'La URL pública de invitaciones no es válida.');
  }
}

function jsonResponse(request: Request, status: number, payload: JsonRecord): Response {
  const cors = responseHeaders(request);
  return new Response(JSON.stringify(payload), { status, headers: cors.headers });
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw new ApiError(500, 'server_configuration', 'La administración no está configurada.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireSuperadmin(request: Request, admin: SupabaseClient): Promise<UsuarioRow> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'unauthorized', 'Debes iniciar sesión.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    throw new ApiError(401, 'unauthorized', 'La sesión no es válida o expiró.');
  }

  const { data: requester, error: profileError } = await admin
    .from('usuarios')
    .select('id,nombre,email,rol,barberia_id,slug,activo,creado_en,actualizado_en')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new ApiError(500, 'profile_lookup_failed', 'No se pudo validar la autorización.');
  }
  if (!requester || requester.rol !== 'superadmin' || !requester.activo) {
    throw new ApiError(403, 'forbidden', 'No tienes permisos para administrar la plataforma.');
  }

  return requester as UsuarioRow;
}

async function getBarberiaOrThrow(
  admin: SupabaseClient,
  barberiaId: string,
  requireActive = false,
): Promise<BarberiaRow> {
  const { data, error } = await admin
    .from('barberias')
    .select('id,nombre,comuna,slug,activo,creado_en,actualizado_en')
    .eq('id', barberiaId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, 'barberia_lookup_failed', 'No se pudo consultar la barbería.');
  }
  if (!data) {
    throw new ApiError(404, 'barberia_not_found', 'La barbería no existe.');
  }
  if (requireActive && !data.activo) {
    throw new ApiError(409, 'barberia_inactive', 'La barbería está inactiva.');
  }
  return data as BarberiaRow;
}

async function slugExists(
  admin: SupabaseClient,
  table: 'barberias' | 'usuarios',
  slug: string,
  options: { barberiaId?: string; excludeId?: string } = {},
): Promise<boolean> {
  let query = admin.from(table).select('id').eq('slug', slug).limit(1);
  if (options.barberiaId) query = query.eq('barberia_id', options.barberiaId);
  if (options.excludeId) query = query.neq('id', options.excludeId);
  const { data, error } = await query;
  if (error) {
    throw new ApiError(500, 'slug_lookup_failed', 'No se pudo validar el slug.');
  }
  return Boolean(data?.length);
}

async function generateAvailableSlug(
  admin: SupabaseClient,
  table: 'barberias' | 'usuarios',
  source: string,
  options: { barberiaId?: string } = {},
): Promise<string> {
  const base = normalizeSlug(source) || (table === 'barberias' ? 'barberia' : 'barbero');
  let candidate = base;
  let suffix = 2;
  while (await slugExists(admin, table, candidate, options)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 10_000) {
      throw new ApiError(409, 'slug_unavailable', 'No se pudo generar un slug disponible.');
    }
  }
  return candidate;
}

async function listBarberias(admin: SupabaseClient): Promise<JsonRecord> {
  const { data: barberias, error: barberiasError } = await admin
    .from('barberias')
    .select('id,nombre,comuna,slug,activo,creado_en,actualizado_en')
    .order('nombre');
  if (barberiasError) {
    throw new ApiError(500, 'barberias_load_failed', 'No se pudieron cargar las barberías.');
  }

  const ids = (barberias ?? []).map((item) => item.id);
  if (ids.length === 0) return { barberias: [] };

  const [usuariosResult, serviciosResult] = await Promise.all([
    admin.from('usuarios').select('id,barberia_id,rol').in('barberia_id', ids),
    admin.from('servicios').select('id,barberia_id').in('barberia_id', ids),
  ]);
  if (usuariosResult.error || serviciosResult.error) {
    throw new ApiError(500, 'summary_load_failed', 'No se pudo cargar el resumen de barberías.');
  }

  const summaries = (barberias ?? []).map((barberia) => {
    const users = (usuariosResult.data ?? []).filter((user) => user.barberia_id === barberia.id);
    const services = (serviciosResult.data ?? []).filter((service) => service.barberia_id === barberia.id);
    return {
      ...barberia,
      usuarios_count: users.length,
      barberos_count: users.filter((user) => user.rol === 'barbero').length,
      servicios_count: services.length,
    };
  });

  return { barberias: summaries };
}

async function getBarberiaDetail(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const barberiaId = requiredUuid(body, 'barberia_id');
  const barberia = await getBarberiaOrThrow(admin, barberiaId);
  const [usuariosResult, serviciosResult] = await Promise.all([
    admin
      .from('usuarios')
      .select('id,nombre,email,rol,barberia_id,slug,activo,creado_en,actualizado_en')
      .eq('barberia_id', barberiaId)
      .order('nombre'),
    admin
      .from('servicios')
      .select('id,nombre,precio,duracion,created_at,barberia_id')
      .eq('barberia_id', barberiaId)
      .order('nombre'),
  ]);
  if (usuariosResult.error || serviciosResult.error) {
    throw new ApiError(500, 'barberia_detail_failed', 'No se pudo cargar el detalle de la barbería.');
  }

  return {
    barberia,
    usuarios: usuariosResult.data ?? [],
    servicios: serviciosResult.data ?? [],
  };
}

async function createBarberia(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const nombre = requiredString(body, 'nombre', 'El nombre', 120);
  const comuna = requiredString(body, 'comuna', 'La comuna', 120);
  const requestedSlug = optionalSlug(body, 'slug');
  const slug = requestedSlug
    ?? await generateAvailableSlug(admin, 'barberias', nombre);

  if (requestedSlug && await slugExists(admin, 'barberias', requestedSlug)) {
    throw new ApiError(409, 'duplicate_barberia_slug', 'Ese slug ya pertenece a otra barbería.');
  }

  const { data, error } = await admin
    .from('barberias')
    .insert({ nombre, comuna, slug, activo: true })
    .select('id,nombre,comuna,slug,activo,creado_en,actualizado_en')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'duplicate_barberia_slug', 'Ese slug ya pertenece a otra barbería.');
    }
    throw new ApiError(500, 'barberia_create_failed', 'No se pudo crear la barbería.');
  }
  return { barberia: data };
}

async function updateBarberia(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const barberiaId = requiredUuid(body, 'barberia_id');
  await getBarberiaOrThrow(admin, barberiaId);
  const nombre = requiredString(body, 'nombre', 'El nombre', 120);
  const comuna = requiredString(body, 'comuna', 'La comuna', 120);
  const slug = optionalSlug(body, 'slug');
  if (!slug) {
    throw new ApiError(400, 'invalid_slug', 'El slug es obligatorio.');
  }
  if (await slugExists(admin, 'barberias', slug, { excludeId: barberiaId })) {
    throw new ApiError(409, 'duplicate_barberia_slug', 'Ese slug ya pertenece a otra barbería.');
  }

  const { data, error } = await admin
    .from('barberias')
    .update({ nombre, comuna, slug })
    .eq('id', barberiaId)
    .select('id,nombre,comuna,slug,activo,creado_en,actualizado_en')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'duplicate_barberia_slug', 'Ese slug ya pertenece a otra barbería.');
    }
    throw new ApiError(500, 'barberia_update_failed', 'No se pudo actualizar la barbería.');
  }
  return { barberia: data };
}

async function setBarberiaActive(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const barberiaId = requiredUuid(body, 'barberia_id');
  const activo = requestedBoolean(body, 'activo');
  await getBarberiaOrThrow(admin, barberiaId);
  const { data, error } = await admin
    .from('barberias')
    .update({ activo })
    .eq('id', barberiaId)
    .select('id,nombre,comuna,slug,activo,creado_en,actualizado_en')
    .single();
  if (error) {
    throw new ApiError(500, 'barberia_status_failed', 'No se pudo cambiar el estado de la barbería.');
  }
  return { barberia: data };
}

async function createTenantUser(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const barberiaId = requiredUuid(body, 'barberia_id');
  await getBarberiaOrThrow(admin, barberiaId, true);
  const nombre = requiredString(body, 'nombre', 'El nombre', 120);
  const email = requiredString(body, 'email', 'El correo', 254).toLowerCase();
  if (!emailPattern.test(email)) {
    throw new ApiError(400, 'invalid_email', 'El correo electrónico no es válido.');
  }

  const roleValue = body.rol;
  if (roleValue !== 'admin' && roleValue !== 'barbero') {
    throw new ApiError(400, 'invalid_role', 'Sólo se pueden crear administradores o barberos.');
  }
  const rol: TenantRole = roleValue;
  const delivery = invitationDelivery(body);

  const { data: duplicateProfile, error: duplicateError } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .limit(1);
  if (duplicateError) {
    throw new ApiError(500, 'email_lookup_failed', 'No se pudo validar el correo.');
  }
  if (duplicateProfile?.length) {
    throw new ApiError(409, 'duplicate_email', 'Ya existe un usuario con ese correo.');
  }

  if (rol === 'admin') {
    const { data: existingAdmin, error: adminError } = await admin
      .from('usuarios')
      .select('id')
      .eq('barberia_id', barberiaId)
      .eq('rol', 'admin')
      .eq('activo', true)
      .limit(1);
    if (adminError) {
      throw new ApiError(500, 'admin_lookup_failed', 'No se pudo validar el administrador existente.');
    }
    if (existingAdmin?.length) {
      throw new ApiError(409, 'admin_exists', 'La barbería ya tiene un administrador activo.');
    }
  }

  const requestedSlug = rol === 'barbero' ? optionalSlug(body, 'slug') : null;
  const slug = rol === 'barbero'
    ? requestedSlug ?? await generateAvailableSlug(admin, 'usuarios', nombre, { barberiaId })
    : null;
  if (slug && requestedSlug && await slugExists(admin, 'usuarios', slug, { barberiaId })) {
    throw new ApiError(409, 'duplicate_barber_slug', 'Ese slug ya está en uso dentro de la barbería.');
  }

  const publicAppUrl = getPublicAppUrl();
  const redirectTo = `${publicAppUrl}/auth/accept-invite`;
  let authUserId: string;
  let invitationUrl: string | null = null;

  if (delivery === 'link') {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { nombre },
        redirectTo,
      },
    });

    if (linkError || !linkData.user || !linkData.properties?.action_link) {
      const duplicate = linkError?.code === 'email_exists'
        || linkError?.code === 'user_already_exists'
        || linkError?.status === 422;
      throw new ApiError(
        duplicate ? 409 : 502,
        duplicate ? 'duplicate_email' : 'auth_invite_link_failed',
        duplicate
          ? 'Ya existe una cuenta Auth con ese correo.'
          : 'No se pudo generar el enlace de invitación. Inténtalo nuevamente.',
      );
    }

    authUserId = linkData.user.id;
    invitationUrl = linkData.properties.action_link;
  } else {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      { data: { nombre }, redirectTo },
    );
    if (inviteError || !inviteData.user) {
      const duplicate = inviteError?.code === 'email_exists'
        || inviteError?.code === 'user_already_exists'
        || inviteError?.message.toLowerCase().includes('already')
        || inviteError?.status === 422;
      const emailUnavailable = inviteError?.code === 'email_address_not_authorized'
        || inviteError?.code === 'over_email_send_rate_limit';
      throw new ApiError(
        duplicate ? 409 : emailUnavailable ? 503 : 502,
        duplicate
          ? 'duplicate_email'
          : emailUnavailable
            ? 'email_delivery_unavailable'
            : 'auth_invite_failed',
        duplicate
          ? 'Ya existe una cuenta Auth con ese correo.'
          : emailUnavailable
            ? 'El correo de prueba de Supabase no puede enviar esta invitación. Genera un enlace para compartirlo directamente.'
            : 'No se pudo enviar la invitación. Inténtalo nuevamente.',
      );
    }

    authUserId = inviteData.user.id;
  }
  const { data: profile, error: profileError } = await admin
    .from('usuarios')
    .insert({
      id: authUserId,
      nombre,
      email,
      rol,
      barberia_id: barberiaId,
      slug,
      activo: true,
    })
    .select('id,nombre,email,rol,barberia_id,slug,activo,creado_en,actualizado_en')
    .single();

  if (profileError) {
    const cleanup = await admin.auth.admin.deleteUser(authUserId);
    if (cleanup.error) {
      console.error('platform-admin cleanup failed', { code: cleanup.error.code });
      throw new ApiError(
        500,
        'profile_cleanup_failed',
        'No se pudo completar la creación del usuario. Se requiere revisión administrativa.',
      );
    }

    if (profileError.code === '23505') {
      throw new ApiError(409, 'duplicate_profile', 'El correo o slug ya está registrado.');
    }
    throw new ApiError(500, 'profile_create_failed', 'No se pudo crear el perfil; la cuenta temporal fue eliminada.');
  }

  return {
    usuario: profile,
    invitacion_enviada: delivery === 'email',
    invitacion_url: invitationUrl,
  };
}

async function setUserActive(admin: SupabaseClient, body: JsonRecord): Promise<JsonRecord> {
  const barberiaId = requiredUuid(body, 'barberia_id');
  const usuarioId = requiredString(body, 'usuario_id', 'El usuario', 64);
  if (!uuidPattern.test(usuarioId)) {
    throw new ApiError(400, 'invalid_user', 'El usuario no es válido.');
  }
  const activo = requestedBoolean(body, 'activo');
  await getBarberiaOrThrow(admin, barberiaId);

  const { data: target, error: targetError } = await admin
    .from('usuarios')
    .select('id,rol,barberia_id')
    .eq('id', usuarioId)
    .eq('barberia_id', barberiaId)
    .maybeSingle();
  if (targetError) {
    throw new ApiError(500, 'user_lookup_failed', 'No se pudo consultar el usuario.');
  }
  if (!target) {
    throw new ApiError(404, 'user_not_found', 'El usuario no pertenece a esta barbería.');
  }
  if (target.rol === 'superadmin') {
    throw new ApiError(403, 'protected_user', 'No se puede modificar un superadmin desde esta operación.');
  }

  const { data, error } = await admin
    .from('usuarios')
    .update({ activo })
    .eq('id', usuarioId)
    .eq('barberia_id', barberiaId)
    .select('id,nombre,email,rol,barberia_id,slug,activo,creado_en,actualizado_en')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'admin_exists', 'La barbería ya tiene un administrador activo.');
    }
    throw new ApiError(500, 'user_status_failed', 'No se pudo cambiar el estado del usuario.');
  }
  return { usuario: data };
}

async function handleAction(
  admin: SupabaseClient,
  body: JsonRecord,
): Promise<JsonRecord> {
  const action = body.action;
  if (typeof action !== 'string') {
    throw new ApiError(400, 'invalid_action', 'Debes indicar una operación.');
  }

  switch (action) {
    case 'listar_barberias':
      return listBarberias(admin);
    case 'obtener_barberia':
      return getBarberiaDetail(admin, body);
    case 'crear_barberia':
      return createBarberia(admin, body);
    case 'actualizar_barberia':
      return updateBarberia(admin, body);
    case 'cambiar_estado_barberia':
      return setBarberiaActive(admin, body);
    case 'crear_usuario':
      return createTenantUser(admin, body);
    case 'cambiar_estado_usuario':
      return setUserActive(admin, body);
    default:
      throw new ApiError(400, 'invalid_action', 'La operación solicitada no existe.');
  }
}

Deno.serve(async (request) => {
  const cors = responseHeaders(request);
  if (!cors.allowed) {
    return jsonResponse(request, 403, { error: { code: 'origin_forbidden', message: 'Origen no permitido.' } });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers });
  }
  if (request.method !== 'POST') {
    return jsonResponse(request, 405, { error: { code: 'method_not_allowed', message: 'Método no permitido.' } });
  }

  try {
    const admin = getAdminClient();
    await requireSuperadmin(request, admin);
    const rawBody = await request.text();
    if (rawBody.length > 16_384) {
      throw new ApiError(413, 'request_too_large', 'La solicitud es demasiado grande.');
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, 'invalid_json', 'La solicitud no contiene JSON válido.');
    }

    const body = asRecord(parsedBody);
    const result = await handleAction(admin, body);
    return jsonResponse(request, 200, { data: result });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse(request, error.status, {
        error: { code: error.code, message: error.message },
      });
    }

    console.error('platform-admin unexpected failure', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return jsonResponse(request, 500, {
      error: { code: 'internal_error', message: 'Ocurrió un error interno.' },
    });
  }
});

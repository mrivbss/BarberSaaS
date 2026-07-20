import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';

export type UserRole = 'superadmin' | 'admin' | 'barbero';

export interface UserSession {
  id: string;
  email: string;
  nombre: string | null;
  rol: UserRole;
  barberia_id: string | null;
  slug: string | null;
  activo: boolean;
  barberia_activa: boolean;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'auth_unavailable'
  | 'profile_unavailable'
  | 'invalid_profile'
  | 'user_inactive'
  | 'barbershop_inactive';

export class AuthAccessError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthAccessError';
    this.code = code;
  }
}

interface LoginResult {
  session: Session;
  profile: UserSession;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'superadmin' || value === 'admin' || value === 'barbero';
}

function firstRpcRow(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) {
    return value.length > 0 && isRecord(value[0]) ? value[0] : null;
  }

  if (!isRecord(value)) return null;

  // Also tolerate an RPC that deliberately returns a JSON object under `profile`.
  return isRecord(value.profile) ? value.profile : value;
}

function parseProfile(value: unknown, authUser: User): UserSession {
  const row = firstRpcRow(value);
  if (!row || !isUserRole(row.rol) || typeof row.activo !== 'boolean') {
    throw new AuthAccessError(
      'invalid_profile',
      'El perfil de acceso no tiene un formato válido.',
    );
  }

  const id = nullableString(row.id);
  const email = nullableString(row.email) ?? authUser.email ?? null;
  const barberiaId = nullableString(row.barberia_id);
  const barberiaActiva = row.rol === 'superadmin' ? true : row.barberia_activa === true;

  if (!id || id !== authUser.id || !email) {
    throw new AuthAccessError(
      'invalid_profile',
      'El perfil autenticado no coincide con la cuenta actual.',
    );
  }

  if (!row.activo) {
    throw new AuthAccessError(
      'user_inactive',
      'Tu usuario está inactivo. Contacta al administrador de la plataforma.',
    );
  }

  if (row.rol !== 'superadmin' && (!barberiaId || !barberiaActiva)) {
    throw new AuthAccessError(
      'barbershop_inactive',
      'La barbería asociada está inactiva o no está disponible.',
    );
  }

  return {
    id,
    email,
    nombre: nullableString(row.nombre),
    rol: row.rol,
    barberia_id: barberiaId,
    slug: nullableString(row.slug),
    activo: true,
    barberia_activa: barberiaActiva,
  };
}

export function cacheValidatedSession(profile: UserSession): void {
  localStorage.setItem('tenant_session', JSON.stringify(profile));
}

export function clearValidatedSession(): void {
  localStorage.removeItem('tenant_session');
}

export async function getMyProfile(authUser: User): Promise<UserSession> {
  const { data, error } = await supabase.rpc('obtener_mi_perfil');

  if (error) {
    console.error('No se pudo resolver el perfil autenticado:', error);
    throw new AuthAccessError(
      'profile_unavailable',
      'No se pudo validar tu perfil de acceso. Inténtalo nuevamente.',
    );
  }

  const profile = parseProfile(data as unknown, authUser);
  cacheValidatedSession(profile);
  return profile;
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    const isCredentialError =
      error.code === 'invalid_credentials' ||
      (error.status === 400 && error.message.toLowerCase().includes('invalid login credentials'));
    const isUnconfirmedEmail = error.code === 'email_not_confirmed';

    throw new AuthAccessError(
      isCredentialError
        ? 'invalid_credentials'
        : isUnconfirmedEmail
          ? 'email_not_confirmed'
          : 'auth_unavailable',
      isCredentialError
        ? 'Correo o contraseña incorrectos.'
        : isUnconfirmedEmail
          ? 'Debes confirmar tu correo antes de iniciar sesión.'
        : 'No se pudo conectar con el servicio de autenticación. Inténtalo nuevamente.',
    );
  }

  if (!data.user || !data.session) {
    throw new AuthAccessError(
      'invalid_credentials',
      'No se pudo iniciar sesión con esas credenciales.',
    );
  }

  try {
    const profile = await getMyProfile(data.user);
    return { session: data.session, profile };
  } catch (profileError) {
    clearValidatedSession();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error('No se pudo limpiar la sesión rechazada:', signOutError);
    throw profileError;
  }
}

export async function logoutUser(): Promise<void> {
  clearValidatedSession();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

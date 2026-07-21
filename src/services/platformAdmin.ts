import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';

export type TenantUserRole = 'admin' | 'barbero';

export interface PlatformBarberia {
  id: string;
  nombre: string;
  comuna: string;
  slug: string;
  activo: boolean;
  creado_en: string | null;
  actualizado_en: string | null;
}

export interface PlatformBarberiaSummary extends PlatformBarberia {
  usuarios_count: number;
  barberos_count: number;
  servicios_count: number;
}

export interface PlatformUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | TenantUserRole;
  barberia_id: string | null;
  slug: string | null;
  activo: boolean;
  creado_en: string | null;
  actualizado_en: string | null;
}

export interface PlatformServicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  created_at: string | null;
  barberia_id: string;
}

export interface PlatformBarberiaDetail {
  barberia: PlatformBarberia;
  usuarios: PlatformUsuario[];
  servicios: PlatformServicio[];
}

export interface SaveBarberiaInput {
  nombre: string;
  comuna: string;
  slug: string;
}

export interface CreateTenantUserInput {
  barberia_id: string;
  nombre: string;
  email: string;
  rol: TenantUserRole;
  slug?: string;
  password: string;
}

export interface CreateTenantUserResult {
  usuario: PlatformUsuario;
}

interface PlatformEnvelope<T> {
  data: T;
}

interface PlatformErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

type PlatformActionPayload = Record<string, string | boolean | undefined> & {
  action: string;
};

export class PlatformAdminError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(message: string, code = 'platform_admin_error', status: number | null = null) {
    super(message);
    this.name = 'PlatformAdminError';
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseErrorEnvelope(value: unknown): PlatformErrorEnvelope | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;

  return {
    error: {
      code: typeof value.error.code === 'string' ? value.error.code : undefined,
      message: typeof value.error.message === 'string' ? value.error.message : undefined,
    },
  };
}

async function errorFromInvocation(error: unknown): Promise<PlatformAdminError> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    let body: unknown = null;
    try {
      body = await error.context.clone().json();
    } catch {
      // An invalid response body still gets a safe, generic client message.
    }

    const envelope = parseErrorEnvelope(body);
    return new PlatformAdminError(
      envelope?.error?.message ?? 'No se pudo completar la operación solicitada.',
      envelope?.error?.code ?? 'platform_admin_http_error',
      error.context.status,
    );
  }

  return new PlatformAdminError(
    'No fue posible conectar con la administración de la plataforma. Inténtalo nuevamente.',
    'platform_admin_unavailable',
  );
}

async function invokePlatformAdmin<T>(payload: PlatformActionPayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke<PlatformEnvelope<T>>('platform-admin', {
    body: payload,
  });

  if (error) throw await errorFromInvocation(error);
  if (!data || !isRecord(data) || !('data' in data)) {
    throw new PlatformAdminError(
      'La administración devolvió una respuesta inesperada.',
      'invalid_platform_response',
    );
  }

  return data.data;
}

export const platformAdmin = {
  async listBarberias(): Promise<PlatformBarberiaSummary[]> {
    const result = await invokePlatformAdmin<{ barberias: PlatformBarberiaSummary[] }>({
      action: 'listar_barberias',
    });
    return result.barberias;
  },

  getBarberia(barberiaId: string): Promise<PlatformBarberiaDetail> {
    return invokePlatformAdmin<PlatformBarberiaDetail>({
      action: 'obtener_barberia',
      barberia_id: barberiaId,
    });
  },

  async createBarberia(input: SaveBarberiaInput): Promise<PlatformBarberia> {
    const result = await invokePlatformAdmin<{ barberia: PlatformBarberia }>({
      action: 'crear_barberia',
      ...input,
    });
    return result.barberia;
  },

  async updateBarberia(
    barberiaId: string,
    input: SaveBarberiaInput,
  ): Promise<PlatformBarberia> {
    const result = await invokePlatformAdmin<{ barberia: PlatformBarberia }>({
      action: 'actualizar_barberia',
      barberia_id: barberiaId,
      ...input,
    });
    return result.barberia;
  },

  async setBarberiaActive(barberiaId: string, activo: boolean): Promise<PlatformBarberia> {
    const result = await invokePlatformAdmin<{ barberia: PlatformBarberia }>({
      action: 'cambiar_estado_barberia',
      barberia_id: barberiaId,
      activo,
    });
    return result.barberia;
  },

  createTenantUser(input: CreateTenantUserInput): Promise<CreateTenantUserResult> {
    return invokePlatformAdmin<CreateTenantUserResult>({
      action: 'crear_usuario',
      ...input,
    });
  },

  async setUserActive(
    barberiaId: string,
    usuarioId: string,
    activo: boolean,
  ): Promise<PlatformUsuario> {
    const result = await invokePlatformAdmin<{ usuario: PlatformUsuario }>({
      action: 'cambiar_estado_usuario',
      barberia_id: barberiaId,
      usuario_id: usuarioId,
      activo,
    });
    return result.usuario;
  },
};

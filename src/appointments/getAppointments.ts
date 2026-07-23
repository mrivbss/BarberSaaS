import { supabase } from '../config/supabaseClient';

export interface CitaInput {
  cliente: string;
  fecha: string;
  hora: string;
  barbero_id: string;
  barberia_id: string;
  servicio_id: number;
}

interface CobroCitaResponse {
  status: string;
  cita_id?: string;
  ganancia_id?: string;
  monto?: number;
  estado?: string;
  ganancia?: Record<string, unknown>;
  cita?: Record<string, unknown>;
}

export class CobroCitaError extends Error {
  readonly status: string;

  constructor(status: string) {
    super(status);
    this.name = 'CobroCitaError';
    this.status = status;
  }
}

export const appointmentServices = {
  // Ahora recibe barberiaId como parámetro
  async getAll(barberiaId: string, barberoId?: string) {
    let query = supabase
      .from('citas')
      .select(`
        *,
        servicios:servicios!citas_servicio_tenant_fkey (
          nombre,
          precio
        )
      `)
      .eq('barberia_id', barberiaId);

    if (barberoId) {
      query = query.eq('barbero_id', barberoId);
    }

    const { data, error } = await query
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(cita: CitaInput) {
    const { data, error } = await supabase
      .from('citas')
      .insert([{ ...cita, estado: 'pendiente' }])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async cobrarCita(citaId: string): Promise<CobroCitaResponse> {
    const { data, error } = await supabase.rpc('cobrar_cita_barbero', {
      p_cita_id: citaId,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Supabase cobrar_cita_barbero error:', error);
      }
      throw error;
    }

    const result = data as unknown as CobroCitaResponse | null;
    if (!result || result.status !== 'ok') {
      if (import.meta.env.DEV) {
        console.error('Supabase cobrar_cita_barbero rejected:', result);
      }
      throw new CobroCitaError(result?.status || 'respuesta_invalida');
    }

    return result;
  },

  async deleteCita(citaId: string, barberiaId: string) {
    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', citaId)
      .eq('barberia_id', barberiaId);

    if (error) throw error;
    return true;
  }
};

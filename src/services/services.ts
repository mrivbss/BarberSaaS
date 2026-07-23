import { supabase } from '../config/supabaseClient';

export interface ServicioInput {
  nombre: string;
  precio: number;
  duracion: number;
  barberia_id: string;
  barbero_id: string;
}

export type ServicioUpdate = Pick<ServicioInput, 'nombre' | 'precio' | 'duracion'>;

export const barberServices = {
  async getAll(barberiaId: string, barberoId: string) {
    const { data, error } = await supabase
      .from('servicios')
      .select('id,nombre,precio,duracion,barberia_id,barbero_id,created_at')
      .eq('barberia_id', barberiaId)
      .eq('barbero_id', barberoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(servicio: ServicioInput) {
    const { data, error } = await supabase
      .from('servicios')
      .insert([servicio])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async update(
    servicioId: number,
    barberiaId: string,
    barberoId: string,
    changes: ServicioUpdate,
  ) {
    const { data, error } = await supabase
      .from('servicios')
      .update(changes)
      .eq('id', servicioId)
      .eq('barberia_id', barberiaId)
      .eq('barbero_id', barberoId)
      .select('id,nombre,precio,duracion,barberia_id,barbero_id,created_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('El servicio no existe o no pertenece al barbero autenticado.');
    return data;
  },

  async remove(servicioId: number, barberiaId: string, barberoId: string) {
    const { data, error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', servicioId)
      .eq('barberia_id', barberiaId)
      .eq('barbero_id', barberoId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('El servicio no existe o no pertenece al barbero autenticado.');
    return true;
  }
};

import { supabase } from '../config/supabaseClient';

export interface ServicioInput {
  nombre: string;
  precio: number;
  duracion: number;
  barberia_id: string;
}

export const barberServices = {
  async getAll(barberiaId: string) {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('barberia_id', barberiaId)
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
  }
};
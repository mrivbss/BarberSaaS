import { supabase } from '../config/supabaseClient';

// Define la estructura para TypeScript si lo necesitas, o déjalo simple
export interface ServicioInput {
  nombre: string;
  precio: number;
  duracion: number;
}

export const barberServices = {
  // Traer todos los servicios
  async getAll() {
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Crear un nuevo servicio
  async create(servicio: ServicioInput) {
    const { data, error } = await supabase
      .from('servicios')
      .insert([servicio])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  }
};
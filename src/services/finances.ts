import { supabase } from '../config/supabaseClient';

export const financeServices = {
  // Traer el historial completo de ganancias
  async getAll() {
    const { data, error } = await supabase
      .from('ganancias')
      .select('*');

    if (error) throw error;
    return data || [];
  }
};
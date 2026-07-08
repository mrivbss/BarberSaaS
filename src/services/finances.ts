import { supabase } from '../config/supabaseClient';

export const financeServices = {
  async getAll(barberiaId: string) { // Definimos el tipo string
    const { data, error } = await supabase
      .from('ganancias')
      .select('*')
      .eq('barberia_id', barberiaId);

    if (error) throw error;
    return data || [];
  }
};
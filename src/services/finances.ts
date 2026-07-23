import { supabase } from '../config/supabaseClient';

export const financeServices = {
  async getAll(barberiaId: string, barberoId: string) {
    const { data, error } = await supabase
      .from('ganancias')
      .select('id,cita_id,monto,concepto,barbero_id,barberia_id,creado_en')
      .eq('barberia_id', barberiaId)
      .eq('barbero_id', barberoId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

import { supabase } from '../config/supabaseClient';

export interface CitaInput {
  cliente: string;
  fecha: string;
  hora: string;
  barbero_id: string;
  barberia_id: string;
  servicio_id: number;
}

export const appointmentServices = {
  // Ahora recibe barberiaId como parámetro
  async getAll(barberiaId: string, barberoId?: string) {
    let query = supabase
      .from('citas')
      .select(`
        *,
        servicios (
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

  async cobrarCita(
    citaId: string, 
    datosGanancia: { monto: number; barbero_id: string; barberia_id: string; concepto: string }
  ) {
    // 1. Actualizar estado de la cita
    const updateCita = await supabase
      .from('citas')
      .update({ estado: 'completada' })
      .eq('id', citaId);

    if (updateCita.error) throw updateCita.error;

    // 2. Registrar el movimiento en ganancias
    const insertGanancia = await supabase
      .from('ganancias')
      .insert([datosGanancia]);

    if (insertGanancia.error) throw insertGanancia.error;

    return true;
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

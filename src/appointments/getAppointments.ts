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
  // Listar citas con sus servicios vinculados
  async getAll() {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        *,
        servicios (
          nombre,
          precio
        )
      `)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Crear cita inicial (por defecto entra como 'pendiente')
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
    datosGanancia: { monto: number; barbero_id: string; barberia_id: string; concepto: string } // 👈 Agregamos el tipo aquí
  ) {
    // 1. Actualizar estado de la cita a completada
    const updateCita = await supabase
      .from('citas')
      .update({ estado: 'completada' })
      .eq('id', citaId);

    if (updateCita.error) throw updateCita.error;

    // 2. Registrar el movimiento en ganancias con su concepto real
    const insertGanancia = await supabase
      .from('ganancias')
      .insert([datosGanancia]);

    if (insertGanancia.error) throw insertGanancia.error;

    return true;
  }
};
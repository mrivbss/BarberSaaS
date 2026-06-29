import { supabase } from '../config/supabaseClient';
import { UserSession } from '../services/login';

export interface Cita {
  id: string;
  cliente: string;
  fecha: string;
  hora: string;
  barbero_id: string;
  barberia_id: string;
}

/**
 * Función 3: Consulta Filtrada (Row Isolation)
 * 
 * Recupera las citas de la base de datos aplicando un filtro estricto
 * de multi-tenancy usando el 'barberia_id' del usuario logueado.
 */
export async function getAppointments(session: UserSession): Promise<Cita[]> {
  try {
    // 1. Consultar base de datos aislando las filas (Row Isolation)
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      // FILTRO MULTI-TENANT: Esta es la pieza fundamental del aislamiento en el frontend.
      // Jamás se traerán datos de otras barberías.
      .eq('barberia_id', session.barberia_id)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;

    console.log(`Se recuperaron ${data.length} citas de la barbería ${session.barberia_id}`);
    
    // 2. Retornar los datos parseados
    return data as Cita[];
    
  } catch (error) {
    console.error('Error al realizar la consulta filtrada de citas:', error);
    return [];
  }
}

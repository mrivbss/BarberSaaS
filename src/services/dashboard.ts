import { supabase } from '../config/supabaseClient';

export interface DashboardStats {
  citasHoy: number;
  ingresosHoy: number;
}

export interface Appointment {
  id: string;
  cliente: string;
  fecha: string;
  hora: string;
  barbero_id: string;
  estado?: string; // Placeholder para estado ya que no existe en el schema, se puede derivar o agregar después
  usuarios?: {
    email: string;
  };
}

export async function getDashboardStats(barberiaId: string): Promise<DashboardStats> {
  const hoy = new Date().toISOString().split('T')[0];
  
  // 1. Obtener Citas de hoy para el Tenant
  const { count: citasHoyCount, error: errorCitas } = await supabase
    .from('citas')
    .select('*', { count: 'exact', head: true })
    .eq('barberia_id', barberiaId)
    .eq('fecha', hoy);

  if (errorCitas) {
    console.error('Error al obtener citas:', errorCitas);
  }

  // 2. Obtener Ingresos de hoy para el Tenant (filtrando por creado_en usando >= y < del día)
  const inicioDia = new Date(hoy + 'T00:00:00').toISOString();
  const finDia = new Date(hoy + 'T23:59:59').toISOString();
  
  const { data: gananciasHoy, error: errorGanancias } = await supabase
    .from('ganancias')
    .select('monto')
    .eq('barberia_id', barberiaId)
    .gte('creado_en', inicioDia)
    .lte('creado_en', finDia);

  if (errorGanancias) {
    console.error('Error al obtener ganancias:', errorGanancias);
  }

  const ingresosHoy = gananciasHoy 
    ? gananciasHoy.reduce((acc, curr) => acc + Number(curr.monto), 0)
    : 0;

  return {
    citasHoy: citasHoyCount || 0,
    ingresosHoy: ingresosHoy
  };
}

export async function getUpcomingAppointments(barberiaId: string): Promise<Appointment[]> {
  const hoy = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('citas')
    .select(`
      id,
      cliente,
      fecha,
      hora,
      barbero_id,
      usuarios:usuarios!citas_barbero_tenant_fkey (
        email
      )
    `)
    .eq('barberia_id', barberiaId)
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error al obtener próximas citas:', error);
    return [];
  }

  return data as unknown as Appointment[];
}

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertDashboardScope(barberiaId: string, barberoId: string): void {
  if (UUID_PATTERN.test(barberiaId) && UUID_PATTERN.test(barberoId)) return;

  if (import.meta.env.DEV) {
    console.error('Dashboard Supabase query blocked because its UUID scope is invalid.', {
      barberiaId: barberiaId || null,
      barberoId: barberoId || null,
    });
  }
  throw new Error('No se pudo validar el alcance del dashboard.');
}

function getLocalDayBounds(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const localDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    localDate,
    start: new Date(year, month, day).toISOString(),
    end: new Date(year, month, day + 1).toISOString(),
  };
}

export async function getDashboardStats(
  barberiaId: string,
  barberoId: string,
): Promise<DashboardStats> {
  assertDashboardScope(barberiaId, barberoId);
  const { localDate, start, end } = getLocalDayBounds();

  const { count: citasHoyCount, error: errorCitas } = await supabase
    .from('citas')
    .select('*', { count: 'exact', head: true })
    .eq('barberia_id', barberiaId)
    .eq('barbero_id', barberoId)
    .eq('fecha', localDate);

  if (errorCitas) {
    console.error('Error al obtener citas:', errorCitas);
  }

  const { data: gananciasHoy, error: errorGanancias } = await supabase
    .from('ganancias')
    .select('monto')
    .eq('barberia_id', barberiaId)
    .eq('barbero_id', barberoId)
    .gte('creado_en', start)
    .lt('creado_en', end);

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

export async function getUpcomingAppointments(
  barberiaId: string,
  barberoId: string,
): Promise<Appointment[]> {
  assertDashboardScope(barberiaId, barberoId);
  const { localDate } = getLocalDayBounds();

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
    .eq('barbero_id', barberoId)
    .gte('fecha', localDate)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error al obtener próximas citas:', error);
    return [];
  }

  return data as unknown as Appointment[];
}

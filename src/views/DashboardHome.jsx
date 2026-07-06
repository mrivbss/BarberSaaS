import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Star, TrendingUp } from 'lucide-react';
import { getDashboardStats, getUpcomingAppointments } from '../services/dashboard';
import {
  PageHeader,
  TenantBadge,
  StatCard,
  Card,
  SectionTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  TableSkeleton,
  EmptyState,
} from '../components/ui';

export function DashboardHome({ usuario }) {
  const [stats, setStats] = useState({ citasHoy: 0, ingresosHoy: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // Si no tenemos barberia_id, no hacemos nada
    if (!usuario?.barberia_id) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const fetchedStats = await getDashboardStats(usuario.barberia_id);
        const fetchedAppointments = await getUpcomingAppointments(usuario.barberia_id);

        setStats(fetchedStats || { citasHoy: 0, ingresosHoy: 0 });
        setAppointments(fetchedAppointments || []);
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [usuario]);

  // Si está cargando, mostramos un pequeño mensaje o spinner
  if (loadingData && stats.ingresosHoy === 0) {
    return <div className="p-10 text-white">Cargando estadísticas...</div>;
  }

  return (
    <div className="animate-fade-in p-6">
      <PageHeader
        title="Resumen General"
        subtitle={`Bienvenido, ${usuario?.email}`}
        badge={<TenantBadge tenantId={usuario?.barberia_id} />}
      />

      {/* KPI Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-slide-up">
        <StatCard icon={Calendar} value={stats.citasHoy} label="Citas hoy" />
        <StatCard icon={DollarSign} value={`$${(stats.ingresosHoy || 0).toLocaleString('es-CL')}`} label="Ingresos del Día" />
        <StatCard icon={Star} value="4.8" label="Calificación" />
        <StatCard icon={TrendingUp} value="+15%" label="Crecimiento" />
      </div>

      {/* Upcoming Appointments */}
      <Card padding="md" className="animate-slide-up">
        <SectionTitle className="mb-5">Próximas Citas</SectionTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length > 0 ? (
              appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell>{appt.cliente || 'Sin nombre'}</TableCell>
                  <TableCell>{appt.hora?.substring(0, 5)}</TableCell>
                  <TableCell><Badge variant="muted">Pendiente</Badge></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState title="No hay citas" description="Las citas aparecerán aquí." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Star, TrendingUp } from 'lucide-react';
import { getDashboardStats, getUpcomingAppointments } from '../services/dashboard';
import { PageTransition } from '../components/layout/PageTransition';
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

  if (loadingData && stats.ingresosHoy === 0) {
    return (
      <PageTransition className="flex min-h-[60vh] items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground/60" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl">
      <PageHeader
        title="Dashboard"
        subtitle={`Bienvenido, ${usuario?.email}`}
        badge={<TenantBadge tenantId={usuario?.barberia_id} />}
      />

      {/* KPI Grid */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Calendar} value={stats.citasHoy} label="Citas hoy" />
        <StatCard icon={DollarSign} value={`$${(stats.ingresosHoy || 0).toLocaleString('es-CL')}`} label="Ingresos del Día" />
        <StatCard icon={Star} value="4.8" label="Calificación" />
        <StatCard icon={TrendingUp} value="+15%" label="Crecimiento" />
      </div>

      {/* Upcoming Appointments */}
      <div>
        <SectionTitle className="mb-4">Próximas Citas</SectionTitle>
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
                  <TableCell className="font-medium">{appt.cliente || 'Sin nombre'}</TableCell>
                  <TableCell className="text-muted-foreground">{appt.hora?.substring(0, 5)}</TableCell>
                  <TableCell><Badge variant="muted">Pendiente</Badge></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState title="Sin citas programadas" description="Las próximas citas aparecerán aquí." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageTransition>
  );
}
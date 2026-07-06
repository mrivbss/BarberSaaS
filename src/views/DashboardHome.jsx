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

export function DashboardHome() {
  const [stats, setStats] = useState({ citasHoy: 0, ingresosHoy: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('tenant_session');
    if (storedSession) {
      const parsedSession = JSON.parse(storedSession);
      setSession(parsedSession);

      const loadData = async () => {
        setLoadingData(true);
        try {
          const fetchedStats = await getDashboardStats(parsedSession.barberia_id);
          const fetchedAppointments = await getUpcomingAppointments(parsedSession.barberia_id);

          setStats(fetchedStats);
          setAppointments(fetchedAppointments);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
        } finally {
          setLoadingData(false);
        }
      };

      loadData();
    }
  }, []);

  if (!session) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Resumen General"
        subtitle={`Bienvenido de vuelta, ${session.email} (${session.rol})`}
        badge={<TenantBadge tenantId={session.barberia_id} />}
      />

      {/* KPI Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-slide-up">
        <StatCard
          icon={Calendar}
          value={stats.citasHoy}
          label="Citas para hoy"
          loading={loadingData}
        />
        <StatCard
          icon={DollarSign}
          value={`$${stats.ingresosHoy.toLocaleString('es-CL')}`}
          label="Ingresos del Día"
          loading={loadingData}
        />
        <StatCard icon={Star} value="4.8" label="Calificación Promedio (Demo)" />
        <StatCard icon={TrendingUp} value="+15%" label="Crecimiento Semanal (Demo)" />
      </div>

      {/* Upcoming Appointments */}
      <Card padding="md" className="animate-slide-up">
        <SectionTitle className="mb-5">Próximas Citas</SectionTitle>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead>Cliente</TableHead>
              <TableHead>Barbero</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingData ? (
              <TableSkeleton rows={3} cols={4} />
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={Calendar}
                    title="No hay próximas citas"
                    description="Las citas programadas aparecerán aquí."
                  />
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell className="font-medium">{appt.cliente}</TableCell>
                  <TableCell className="text-muted">
                    {appt.usuarios?.email || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted font-mono text-xs">
                    {appt.hora.substring(0, 5)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">Pendiente</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

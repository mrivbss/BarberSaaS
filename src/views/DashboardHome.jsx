import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Star, Clock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function DashboardHome() {
  const { loading: authLoading, session, profile } = useAuth();
  const authUserId = session?.user?.id;
  const profileId = profile?.id;
  const barberiaId = profile?.barberia_id;
  const [stats, setStats] = useState({ citasHoy: 0, ingresosHoy: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | BarberSaaS';
    if (authLoading) return;

    const hasValidContext = (
      UUID_PATTERN.test(authUserId || '')
      && UUID_PATTERN.test(profileId || '')
      && UUID_PATTERN.test(barberiaId || '')
      && profileId === authUserId
    );

    if (!hasValidContext) {
      if (import.meta.env.DEV) {
        console.warn('Dashboard queries skipped: authenticated user or profile UUID is unavailable.', {
          hasAuthenticatedUser: Boolean(session?.user),
          authUserId: authUserId || null,
          hasProfile: Boolean(profile),
          profileId: profileId || null,
          barberiaId: barberiaId || null,
        });
      }
      setLoadingData(false);
      return;
    }

    let active = true;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [fetchedStats, fetchedAppointments] = await Promise.all([
          getDashboardStats(barberiaId, authUserId),
          getUpcomingAppointments(barberiaId, authUserId),
        ]);

        if (active) {
          setStats(fetchedStats || { citasHoy: 0, ingresosHoy: 0 });
          setAppointments(fetchedAppointments || []);
        }
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        if (active) setLoadingData(false);
      }
    };

    const handleFinancialUpdate = () => {
      void loadData();
    };

    void loadData();
    window.addEventListener('barbersaas:financials-updated', handleFinancialUpdate);

    return () => {
      active = false;
      window.removeEventListener('barbersaas:financials-updated', handleFinancialUpdate);
    };
  }, [authLoading, session?.user, authUserId, profile, profileId, barberiaId]);


  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Bienvenido, ${profile?.email || session?.user?.email || ''}`}
        badge={<TenantBadge tenantId={barberiaId} />}
      />

      {/* KPI Grid */}
      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loadingData ? (
          <>
            <div className="md:col-span-2 xl:col-span-2 border-2 border-slate-900 animate-pulse bg-slate-100 rounded-xl h-28" />
            <div className="md:col-span-1 border-2 border-slate-900 animate-pulse bg-slate-100 rounded-xl h-28" />
            <div className="md:col-span-1 border-2 border-slate-900 animate-pulse bg-slate-100 rounded-xl h-28" />
            <div className="md:col-span-1 xl:col-span-2 border-2 border-slate-900 animate-pulse bg-slate-100 rounded-xl h-28" />
          </>
        ) : (
          <>
            <StatCard 
              className="md:col-span-2 xl:col-span-2" 
              icon={DollarSign} 
              value={`$${(stats.ingresosHoy || 0).toLocaleString('es-CL')}`} 
              label="Ingresos del Día" 
              subtext={stats.ingresosHoy === 0 ? <span className="text-slate-400 font-medium text-xs">Sin ingresos registrados hoy</span> : null}
            />
            <StatCard className="md:col-span-1" icon={Calendar} value={stats.citasHoy} label="Citas hoy" subtext={null} />
            <StatCard className="md:col-span-1" icon={Star} value="4.8" label="Calificación" subtext={null} />
            <StatCard 
              className="md:col-span-1 xl:col-span-2" 
              icon={Clock} 
              value={appointments.length > 0 ? appointments[0].hora?.substring(0, 5) : "--:--"} 
              label="Cita Próxima" 
              subtext={appointments.length > 0 ? (appointments[0].cliente || 'Sin nombre') : "No hay citas próximas"}
            />
          </>
        )}
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
                  <TableCell className="font-bold text-slate-900">{appt.cliente || 'Sin nombre'}</TableCell>
                  <TableCell className="font-mono font-bold text-slate-900">{appt.hora?.substring(0, 5)}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-300 text-slate-950 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      Pendiente
                    </div>
                  </TableCell>
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

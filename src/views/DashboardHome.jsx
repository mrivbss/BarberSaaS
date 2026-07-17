import { useEffect, useState } from 'react';
import { Calendar, DollarSign, Star, Clock } from 'lucide-react';
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


  return (
    <PageTransition className="p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Bienvenido, ${usuario?.email}`}
        badge={<TenantBadge tenantId={usuario?.barberia_id} />}
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
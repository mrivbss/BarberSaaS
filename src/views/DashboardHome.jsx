import React, { useEffect, useState } from 'react';
import { getDashboardStats, getUpcomingAppointments } from '../services/dashboard';

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
          console.error("Error loading dashboard data:", error);
        } finally {
          setLoadingData(false);
        }
      };
      
      loadData();
    }
  }, []);

  if (!session) return null;

  return (
    <>
      <header style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Resumen General</h1>
          <p style={styles.pageSubtitle}>
            Bienvenido de vuelta, {session.email} ({session.rol})
          </p>
        </div>
        <div style={styles.tenantBadge}>
          Tenant ID: {session.barberia_id.substring(0, 8)}...
        </div>
      </header>

      {/* KPI Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>📅</div>
          <div style={styles.kpiInfo}>
            <h3 style={styles.kpiValue}>
              {loadingData ? '...' : stats.citasHoy}
            </h3>
            <p style={styles.kpiLabel}>Citas para hoy</p>
          </div>
        </div>
        
        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>💸</div>
          <div style={styles.kpiInfo}>
            <h3 style={styles.kpiValue}>
              {loadingData ? '...' : `$${stats.ingresosHoy.toLocaleString('es-CL')}`}
            </h3>
            <p style={styles.kpiLabel}>Ingresos del Día</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>⭐</div>
          <div style={styles.kpiInfo}>
            <h3 style={styles.kpiValue}>4.8</h3>
            <p style={styles.kpiLabel}>Calificación Promedio (Demo)</p>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>📈</div>
          <div style={styles.kpiInfo}>
            <h3 style={styles.kpiValue}>+15%</h3>
            <p style={styles.kpiLabel}>Crecimiento Semanal (Demo)</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section style={styles.activitySection}>
        <h2 style={styles.sectionTitle}>Próximas Citas</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Barbero</th>
                <th style={styles.th}>Hora</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr style={styles.tr}>
                  <td style={styles.td} colSpan="4">Cargando citas...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr style={styles.tr}>
                  <td style={styles.td} colSpan="4">No hay próximas citas.</td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr style={styles.tr} key={appt.id}>
                    <td style={styles.td}>{appt.cliente}</td>
                    <td style={styles.td}>{appt.usuarios?.email || 'N/A'}</td>
                    <td style={styles.td}>{appt.hora.substring(0, 5)}</td>
                    <td style={styles.td}>
                      <span style={styles.badgePending}>Pendiente</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// Estilos Compartidos (Dark Premium)
const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: '#a1a1aa',
    margin: 0,
  },
  tenantBadge: {
    backgroundColor: '#d97706',
    color: '#000000',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  kpiCard: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  kpiIconWrapper: {
    fontSize: '32px',
    marginRight: '20px',
    backgroundColor: '#27272a',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
  },
  kpiInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  kpiLabel: {
    fontSize: '14px',
    color: '#a1a1aa',
    margin: 0,
  },
  activitySection: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 20px 0',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    borderBottom: '1px solid #3f3f46',
    color: '#a1a1aa',
    fontWeight: '500',
    fontSize: '14px',
  },
  tr: {
    borderBottom: '1px solid #27272a',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#e4e4e7',
  },
  badgePending: {
    backgroundColor: '#3f3f46',
    color: '#e4e4e7',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  }
};

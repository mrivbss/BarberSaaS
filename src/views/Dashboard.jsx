import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('tenant_session');
    if (!storedSession) {
      navigate('/login');
    } else {
      setSession(JSON.parse(storedSession));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('tenant_session');
    navigate('/login');
  };

  if (!session) {
    return null;
  }

  // Estilo activo dinámico para los enlaces
  const navLinkStyle = ({ isActive }) => 
    isActive 
      ? { ...styles.navItem, ...styles.navItemActive }
      : styles.navItem;

  return (
    <div style={styles.container}>
      {/* Sidebar Navigation */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>💈</span>
          <h2 style={styles.logoText}>BarberSaaS</h2>
        </div>
        <nav style={styles.nav}>
          <NavLink to="/dashboard" end style={navLinkStyle}>
            <span style={styles.navIcon}>📊</span> Dashboard
          </NavLink>
          <NavLink to="/dashboard/agenda" style={navLinkStyle}>
            <span style={styles.navIcon}>📅</span> Agenda
          </NavLink>
          <NavLink to="/dashboard/servicios" style={navLinkStyle}>
            <span style={styles.navIcon}>✂️</span> Servicios
          </NavLink>
          <NavLink to="/dashboard/clientes" style={navLinkStyle}>
            <span style={styles.navIcon}>👥</span> Clientes
          </NavLink>
          <NavLink to="/dashboard/finanzas" style={navLinkStyle}>
            <span style={styles.navIcon}>💰</span> Finanzas
          </NavLink>
        </nav>
        <div style={styles.logoutContainer}>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content (Nested Views rendered here via Outlet) */}
      <main style={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}

// Estilos Integrados (Dark Premium)
const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#09090b',
    color: '#ffffff',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#18181b',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    marginBottom: '40px',
  },
  logoIcon: {
    fontSize: '28px',
    marginRight: '12px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '0 16px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    color: '#a1a1aa',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: '500',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    backgroundColor: '#27272a',
    color: '#ffffff',
  },
  navIcon: {
    marginRight: '12px',
    fontSize: '18px',
  },
  logoutContainer: {
    padding: '0 24px',
    marginTop: 'auto',
  },
  logoutButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid #3f3f46',
    color: '#e4e4e7',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
  }
};

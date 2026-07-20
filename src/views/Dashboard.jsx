import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from '../components/layout/Navbar';

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  useEffect(() => {
    document.title = 'Dashboard | BarberSaaS';
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('No se pudo cerrar la sesión remota:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar role={profile.rol} onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        <Outlet />
      </main>
    </div>
  );
}

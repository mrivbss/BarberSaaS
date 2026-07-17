import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

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

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        <Outlet />
      </main>
    </div>
  );
}

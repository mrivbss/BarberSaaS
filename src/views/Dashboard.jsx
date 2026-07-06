import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

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
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

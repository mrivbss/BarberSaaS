import { Link, useLocation } from 'react-router-dom';
import { Scissors, LogOut } from 'lucide-react';
import { cn } from '../../lib/cn';

const navItems = [
  { to: '/dashboard', end: true, label: 'DASHBOARD' },
  { to: '/dashboard/agenda', label: 'AGENDA' },
  { to: '/dashboard/servicios', label: 'SERVICIOS' },
  { to: '/dashboard/finanzas', label: 'FINANZAS' },
];

interface NavbarProps {
  onLogout: () => void;
}

export function Navbar({ onLogout }: NavbarProps) {
  const location = useLocation();

  return (
    <div className="sticky top-4 z-50 mx-auto w-[92%] max-w-7xl">
      <div className="flex items-center justify-between bg-slate-900 border-2 border-slate-900 rounded-2xl px-8 py-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        
        {/* Lado Izquierdo: Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-amber-400 text-slate-900 font-black rounded-lg p-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Scissors className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-black tracking-wider text-white text-lg uppercase mt-0.5">
            BarberSaaS
          </span>
        </div>

        {/* Lado Derecho: Navegación & Acciones */}
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8 mr-2">
            {navItems.map(({ to, end, label }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'text-xs uppercase tracking-wider transition-colors rounded-lg',
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black px-3 py-1 border border-slate-900'
                      : 'text-slate-300 hover:text-white font-bold px-3 py-1.5'
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          
          <button
            onClick={onLogout}
            className="flex items-center justify-center h-9 w-9 bg-slate-100 text-slate-900 hover:bg-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

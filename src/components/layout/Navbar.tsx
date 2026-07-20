import { Link, useLocation } from 'react-router-dom';
import { Scissors, LogOut } from 'lucide-react';
import type { UserRole } from '../../services/login';
import { cn } from '../../lib/cn';

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  roles: readonly UserRole[];
}

const navItems: readonly NavItem[] = [
  { to: '/dashboard', end: true, label: 'DASHBOARD', roles: ['admin', 'barbero'] },
  { to: '/dashboard/agenda', label: 'AGENDA', roles: ['admin', 'barbero'] },
  { to: '/dashboard/servicios', label: 'SERVICIOS', roles: ['admin'] },
  { to: '/dashboard/finanzas', label: 'FINANZAS', roles: ['admin'] },
];

interface NavbarProps {
  role: UserRole;
  onLogout: () => Promise<void>;
}

export function Navbar({ role, onLogout }: NavbarProps) {
  const location = useLocation();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <div className="sticky top-4 z-50 mx-auto w-[92%] max-w-7xl">
      <div className="flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-slate-900 px-8 py-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-400 p-2 font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Scissors className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="mt-0.5 text-lg font-black uppercase tracking-wider text-white">
            BarberSaaS
          </span>
        </div>

        <div className="flex items-center gap-8">
          <nav className="mr-2 hidden items-center gap-8 md:flex">
            {visibleItems.map(({ to, end, label }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'rounded-lg text-xs uppercase tracking-wider transition-colors',
                    isActive
                      ? 'border border-slate-900 bg-amber-400 px-3 py-1 font-black text-slate-950'
                      : 'px-3 py-1.5 font-bold text-slate-300 hover:text-white',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-900 bg-slate-100 text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all hover:-translate-y-0.5 hover:bg-white"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="ml-0.5 h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  Wallet,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/cn';

const navItems = [
  { to: '/dashboard', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/dashboard/servicios', icon: Scissors, label: 'Servicios' },
  { to: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard/finanzas', icon: Wallet, label: 'Finanzas' },
];

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] border border-border-subtle">
          <Scissors className="h-4 w-4 text-foreground" strokeWidth={2} />
        </div>
        <span className="text-base font-semibold tracking-tight text-foreground">
          BarberSaaS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('nav-link', isActive && 'nav-link-active')
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-border-subtle p-4">
        <Button variant="secondary" fullWidth onClick={onLogout}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}

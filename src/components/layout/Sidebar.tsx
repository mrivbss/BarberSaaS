import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, CalendarDays, Scissors, Banknote, LogOut } from 'lucide-react';
import { cn } from '../../lib/cn';

const navItems = [
  { to: '/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/dashboard/servicios', label: 'Servicios', icon: Scissors },
  { to: '/dashboard/finanzas', label: 'Finanzas', icon: Banknote },
];

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/80 bg-surface py-6">
      {/* Logo */}
      <div className="mb-8 px-6">
        <span className="font-serif text-xl tracking-tight text-foreground">
          BarberSaaS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map(({ to, end, label, icon: Icon }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.03]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-foreground/[0.04] border border-border/60"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" strokeWidth={isActive ? 2 : 1.5} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 mt-auto pt-4 border-t border-border/60 mx-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.03] transition-all duration-200"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

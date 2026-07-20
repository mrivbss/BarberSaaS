import { Building2, LogOut, Plus, Scissors, ShieldCheck } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { cn } from '../../lib/cn';

const platformLinks = [
  { to: '/platform/barberias', label: 'Barberías', icon: Building2 },
  { to: '/platform/barberias/nueva', label: 'Nueva barbería', icon: Plus },
] as const;

export function PlatformLayout() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('No se pudo cerrar la sesión remota:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-slate-900 lg:flex">
      <aside className="relative border-b-2 border-slate-900 bg-slate-950 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r-2">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link to="/platform/barberias" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.8)]">
              <Scissors className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-base font-black uppercase tracking-wide">BarberSaaS</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                Plataforma
              </span>
            </span>
          </Link>

          <div className="hidden border-b border-white/15 pb-6 pt-8 lg:block">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              Superadministrador
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              {profile?.nombre ?? profile?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1 lg:px-4 lg:py-6">
          {platformLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('barberias')}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 hidden w-64 border-t border-white/15 p-4 lg:block">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

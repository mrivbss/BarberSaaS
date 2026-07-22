import {
  Activity,
  Building2,
  Command,
  Gauge,
  LogOut,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PlatformCommandPalette } from './command/PlatformCommandPalette';
import '../../styles/platform.css';

const platformLinks = [
  { to: '/platform', label: 'Mission Control', icon: Gauge },
  { to: '/platform/barberias', label: 'Barberías', icon: Building2 },
  { to: '/platform/barberias/nueva', label: 'Nueva barbería', icon: Plus },
] as const;

function platformArea(pathname: string): string {
  if (pathname === '/platform' || pathname === '/platform/') return 'Mission Control';
  if (pathname === '/platform/barberias/nueva') return 'Nueva barbería';
  if (pathname.endsWith('/editar')) return 'Editar barbería';
  if (/^\/platform\/barberias\/[^/]+(?:\/usuarios)?$/.test(pathname)) {
    return 'Detalle del tenant';
  }
  return 'Barberías';
}

function platformNavIndex(pathname: string): number {
  if (pathname === '/platform' || pathname === '/platform/') return 0;
  if (pathname === '/platform/barberias/nueva') return 2;
  return 1;
}

function platformPageKey(pathname: string): string {
  return pathname.replace(/\/usuarios$/, '');
}

export function PlatformLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const activeNavIndex = platformNavIndex(location.pathname);
  const profileName = profile?.nombre ?? 'Superadministrador';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'S';

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('No se pudo cerrar la sesión remota:', error);
    } finally {
      navigate('/login', { replace: true });
    }
  }, [navigate, signOut]);

  return (
    <div className="platform-shell">
      <a className="platform-skip-link" href="#platform-main-content">
        Saltar al contenido principal
      </a>
      <aside className="platform-sidebar">
        <div className="platform-sidebar__ambient" aria-hidden="true" />

        <div className="platform-sidebar__topline">
          <Link to="/platform" className="platform-brand" aria-label="BarberSaaS Plataforma">
            <span className="platform-brand__mark" aria-hidden="true">
              <span className="platform-brand__glow" />
              <Scissors className="platform-brand__icon" strokeWidth={2.4} />
            </span>
            <span className="platform-brand__copy">
              <span className="platform-brand__name">BarberSaaS</span>
              <span className="platform-brand__edition">Platform OS</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="platform-icon-button platform-sidebar__mobile-logout"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>

        <div className="platform-environment" aria-label="Entorno de producción">
          <span className="platform-environment__signal" aria-hidden="true" />
          <span>Producción</span>
          <span className="platform-environment__secure">
            <ShieldCheck aria-hidden="true" />
            Seguro
          </span>
        </div>

        <div className="platform-operator">
          <span className="platform-operator__avatar" aria-hidden="true">{profileInitial}</span>
          <span className="platform-operator__copy">
            <span className="platform-operator__role">Superadministrador</span>
            <span className="platform-operator__name">{profileName}</span>
          </span>
          <Sparkles className="platform-operator__spark" aria-hidden="true" />
        </div>

        <div className="platform-nav-label">Navegación</div>
        <nav
          className={`platform-nav platform-nav--index-${activeNavIndex}`}
          aria-label="Navegación de plataforma"
        >
          <span className="platform-nav__indicator" aria-hidden="true">
            <span className="platform-nav__liquid" />
          </span>

          {platformLinks.map(({ to, label, icon: Icon }, index) => {
            const isActive = index === activeNavIndex;
            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className={`platform-nav__link${isActive ? ' is-active' : ''}`}
              >
                <span className="platform-nav__icon">
                  <Icon aria-hidden="true" strokeWidth={isActive ? 2.25 : 1.8} />
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="platform-sidebar__footer">
          <div className="platform-sidebar__footer-rule" />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="platform-logout-button"
          >
            <span className="platform-logout-button__icon">
              <LogOut aria-hidden="true" />
            </span>
            <span>
              <span className="platform-logout-button__label">Cerrar sesión</span>
              <span className="platform-logout-button__hint">Finalizar acceso seguro</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="platform-workspace">
        <header className="platform-header">
          <div className="platform-header__identity">
            <span className="platform-header__command" aria-hidden="true">
              <Command />
            </span>
            <div>
              <div className="platform-header__breadcrumb">
                <span>Plataforma</span>
                <span aria-hidden="true">/</span>
                <strong>{platformArea(location.pathname)}</strong>
              </div>
              <p className="platform-header__title">Centro de control</p>
            </div>
          </div>

          <div className="platform-header__status">
            <PlatformCommandPalette onLogout={handleLogout} />
            <span className="platform-system-status">
              <Activity aria-hidden="true" />
              <span className="platform-system-status__copy">
                <strong>Sistema operativo</strong>
                <span>Conexión protegida</span>
              </span>
            </span>
            <span className="platform-header__avatar" title={profileName}>{profileInitial}</span>
          </div>
        </header>

        <main id="platform-main-content" className="platform-stage" tabIndex={-1}>
          <div className="platform-stage__aurora" aria-hidden="true" />
          <div
            key={platformPageKey(location.pathname)}
            className="platform-stage__content platform-route-transition"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

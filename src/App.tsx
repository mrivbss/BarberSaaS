import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import type { UserRole } from './services/login';
import { DashboardHome } from './views/DashboardHome';
import { Login } from './views/Login';
import { Agenda } from './views/Agenda';
import { Servicios } from './views/Servicios';
import { Finanzas } from './views/Finanzas';
import { PublicLandingPage } from './views/PublicLandingPage';
import { SetPassword } from './views/SetPassword';
import { Dashboard } from './views/Dashboard';

const LazyPlatformLayout = lazy(() =>
  import('./components/platform/PlatformLayout').then((module) => ({
    default: module.PlatformLayout,
  })),
);
const LazyPlatformMissionControl = lazy(() =>
  import('./views/platform/PlatformMissionControl').then((module) => ({
    default: module.PlatformMissionControl,
  })),
);
const LazyPlatformBarberias = lazy(() =>
  import('./views/platform/PlatformBarberias').then((module) => ({
    default: module.PlatformBarberias,
  })),
);
const LazyPlatformBarberiaForm = lazy(() =>
  import('./views/platform/PlatformBarberiaForm').then((module) => ({
    default: module.PlatformBarberiaForm,
  })),
);
const LazyPlatformBarberiaDetail = lazy(() =>
  import('./views/platform/PlatformBarberiaDetail').then((module) => ({
    default: module.PlatformBarberiaDetail,
  })),
);

const TENANT_ROLES: readonly UserRole[] = ['admin', 'barbero'];
const BARBER_ROLES: readonly UserRole[] = ['barbero'];
const PLATFORM_ROLES: readonly UserRole[] = ['superadmin'];

function destinationForRole(role: UserRole): string {
  return role === 'superadmin' ? '/platform' : '/dashboard';
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
      Cargando sistema...
    </div>
  );
}

function PlatformRouteBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={(
        <div className="platform-page-loading" role="status" aria-live="polite">
          <span className="sr-only">Cargando sección de Platform…</span>
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

function RequireRoles({ allowedRoles }: { allowedRoles: readonly UserRole[] }) {
  const { loading, session, profile } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(profile.rol)) {
    return <Navigate to={destinationForRole(profile.rol)} replace />;
  }

  return <Outlet />;
}

function LoginRoute() {
  const { loading, profile } = useAuth();
  if (loading) return <LoadingScreen />;
  return profile ? <Navigate to={destinationForRole(profile.rol)} replace /> : <Login />;
}

function DashboardHomeRoute() {
  return <DashboardHome />;
}

function RootRedirect() {
  const { loading, profile } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={profile ? destinationForRole(profile.rol) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/b/:barberiaSlug" element={<PublicLandingPage />} />
      <Route path="/b/:barberiaSlug/:barberoSlug" element={<PublicLandingPage />} />
      <Route path="/login" element={<LoginRoute />} />
      {/* Compatibilidad temporal para invitaciones emitidas antes de la creación directa. */}
      <Route path="/auth/accept-invite" element={<SetPassword />} />
      <Route path="/establecer-contrasena" element={<SetPassword />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route element={<RequireRoles allowedRoles={TENANT_ROLES} />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHomeRoute />} />
          <Route path="agenda" element={<Agenda />} />
          <Route element={<RequireRoles allowedRoles={BARBER_ROLES} />}>
            <Route path="servicios" element={<Servicios />} />
            <Route path="finanzas" element={<Finanzas />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireRoles allowedRoles={PLATFORM_ROLES} />}>
        <Route
          path="/platform"
          element={(
            <Suspense fallback={<LoadingScreen />}>
              <LazyPlatformLayout />
            </Suspense>
          )}
        >
          <Route index element={<PlatformRouteBoundary><LazyPlatformMissionControl /></PlatformRouteBoundary>} />
          <Route path="barberias" element={<PlatformRouteBoundary><LazyPlatformBarberias /></PlatformRouteBoundary>} />
          <Route path="barberias/nueva" element={<PlatformRouteBoundary><LazyPlatformBarberiaForm /></PlatformRouteBoundary>} />
          <Route path="barberias/:barberiaId" element={<PlatformRouteBoundary><LazyPlatformBarberiaDetail /></PlatformRouteBoundary>} />
          <Route path="barberias/:barberiaId/editar" element={<PlatformRouteBoundary><LazyPlatformBarberiaForm /></PlatformRouteBoundary>} />
          <Route path="barberias/:barberiaId/usuarios" element={<PlatformRouteBoundary><LazyPlatformBarberiaDetail /></PlatformRouteBoundary>} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

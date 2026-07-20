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
import { PlatformLayout } from './components/platform/PlatformLayout';
import {
  PlatformBarberiaDetail,
  PlatformBarberiaForm,
  PlatformBarberias,
} from './views/platform';

const TENANT_ROLES: readonly UserRole[] = ['admin', 'barbero'];
const ADMIN_ROLES: readonly UserRole[] = ['admin'];
const PLATFORM_ROLES: readonly UserRole[] = ['superadmin'];

function destinationForRole(role: UserRole): string {
  return role === 'superadmin' ? '/platform/barberias' : '/dashboard';
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
      Cargando sistema...
    </div>
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
  const { profile } = useAuth();
  return profile ? <DashboardHome usuario={profile} /> : null;
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
      <Route path="/auth/accept-invite" element={<SetPassword />} />
      <Route path="/establecer-contrasena" element={<SetPassword />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route element={<RequireRoles allowedRoles={TENANT_ROLES} />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHomeRoute />} />
          <Route path="agenda" element={<Agenda />} />
          <Route element={<RequireRoles allowedRoles={ADMIN_ROLES} />}>
            <Route path="servicios" element={<Servicios />} />
            <Route path="finanzas" element={<Finanzas />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireRoles allowedRoles={PLATFORM_ROLES} />}>
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<Navigate to="barberias" replace />} />
          <Route path="barberias" element={<PlatformBarberias />} />
          <Route path="barberias/nueva" element={<PlatformBarberiaForm />} />
          <Route path="barberias/:barberiaId" element={<PlatformBarberiaDetail />} />
          <Route path="barberias/:barberiaId/editar" element={<PlatformBarberiaForm />} />
          <Route path="barberias/:barberiaId/usuarios" element={<PlatformBarberiaDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

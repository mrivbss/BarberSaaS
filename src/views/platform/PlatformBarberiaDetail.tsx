import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Scissors,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui';
import LineSidebar, {
  type DetailNavigationItem,
} from '../../components/platform/detail/LineSidebar';
import {
  AnimatedCounter,
  ConfirmDialog,
  CopyButton,
  LoadingState,
  PlatformToast,
  type CopyFeedback,
} from '../../components/platform/polish';
import { buildPublicBookingUrl } from '../../lib/slug';
import { useMountedRef } from '../../hooks/useMountedRef';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformBarberiaDetail as BarberiaDetail,
  type PlatformUsuario,
  type TenantUserRole,
} from '../../services/platformAdmin';

let createUserPanelPromise: ReturnType<typeof importCreateUserPanel> | null = null;

function importCreateUserPanel() {
  return import('../../components/platform/detail/CreateTenantUserPanel');
}

function loadCreateUserPanel() {
  createUserPanelPromise ??= importCreateUserPanel();
  return createUserPanelPromise;
}

const LazyCreateTenantUserPanel = lazy(loadCreateUserPanel);

interface NavigationState {
  notice?: string;
  openCreateUser?: boolean;
}

type ConfirmationAction =
  | { kind: 'user'; user: PlatformUsuario; nextStatus: boolean }
  | { kind: 'barberia'; nextStatus: boolean };

const detailSections: readonly DetailNavigationItem[] = [
  { id: 'overview', label: 'Overview', description: 'Estado general', icon: Building2 },
  { id: 'usuarios', label: 'Usuarios', description: 'Accesos y roles', icon: Users },
  { id: 'servicios', label: 'Servicios', description: 'Catálogo del tenant', icon: Wrench },
  { id: 'portal', label: 'Portal', description: 'Enlaces públicos', icon: Globe2 },
  { id: 'configuracion', label: 'Configuración', description: 'Estado y metadata', icon: Settings2 },
] as const;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Sin registro' : dateFormatter.format(parsed);
}

interface UserRowProps {
  user: PlatformUsuario;
  barberiaSlug: string;
  updating: boolean;
  onCopyFeedback: (feedback: CopyFeedback) => void;
  onRequestToggle: (user: PlatformUsuario) => void;
}

const PlatformUserRow = memo(function PlatformUserRow({
  user,
  barberiaSlug,
  updating,
  onCopyFeedback,
  onRequestToggle,
}: UserRowProps) {
  const barberUrl =
    user.rol === 'barbero' && user.slug
      ? buildPublicBookingUrl(barberiaSlug, user.slug)
      : null;

  return (
    <TableRow>
      <TableCell>
        <p className="font-black text-slate-950">{user.nombre}</p>
        <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
      </TableCell>
      <TableCell>
        <Badge variant="muted">
          {user.rol === 'admin' ? 'Administrador' : 'Barbero'}
        </Badge>
      </TableCell>
      <TableCell>
        {barberUrl ? (
          <div className="detail-table-link">
            <code>{user.slug}</code>
            <CopyButton value={barberUrl} subject={user.nombre} onFeedback={onCopyFeedback} />
            <a
              href={barberUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir enlace público de ${user.nombre}`}
              title="Abrir enlace público"
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        ) : (
          <span className="text-xs text-slate-400">No aplica</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={user.activo ? 'success' : 'warning'}>
          {user.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs font-medium">
        {formatDate(user.creado_en)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          size="sm"
          variant={user.activo ? 'danger' : 'secondary'}
          disabled={updating}
          onClick={() => onRequestToggle(user)}
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {user.activo ? 'Desactivar' : 'Reactivar'}
        </Button>
      </TableCell>
    </TableRow>
  );
});

export function PlatformBarberiaDetail() {
  const mountedRef = useMountedRef();
  const { barberiaId } = useParams<{ barberiaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as NavigationState | null;
  const [detail, setDetail] = useState<BarberiaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(navigationState?.notice ?? null);
  const [showCreateUser, setShowCreateUser] = useState(navigationState?.openCreateUser === true);
  const [createUserInitialRole, setCreateUserInitialRole] = useState<TenantUserRole>(
    navigationState?.openCreateUser ? 'admin' : 'barbero',
  );
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingBarberia, setUpdatingBarberia] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const createUserButtonRef = useRef<HTMLButtonElement>(null);

  const loadDetail = useCallback(async () => {
    if (!barberiaId) {
      setError('La barbería solicitada no es válida.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await platformAdmin.getBarberia(barberiaId);
      if (mountedRef.current) setDetail(result);
    } catch (loadError) {
      if (mountedRef.current) setError(errorMessage(loadError));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [barberiaId, mountedRef]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (detail) document.title = `${detail.barberia.nombre} | BarberSaaS`;
  }, [detail]);

  useEffect(() => {
    if (!navigationState?.notice) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, navigationState?.notice]);

  useEffect(() => {
    if (!detail || (!location.pathname.endsWith('/usuarios') && !navigationState?.openCreateUser)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('usuarios')?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detail, location.pathname, navigationState?.openCreateUser]);

  const summary = useMemo(() => {
    const usuarios = detail?.usuarios ?? [];
    return {
      users: usuarios.length,
      barbers: usuarios.filter((user) => user.rol === 'barbero').length,
      services: detail?.servicios.length ?? 0,
    };
  }, [detail]);

  const toastMessage = useMemo(
    () =>
      error
        ? { id: 1, tone: 'error' as const, message: error }
        : success
          ? { id: 2, tone: 'success' as const, message: success }
          : null,
    [error, success],
  );

  const dismissToast = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const closeCreateUserForm = useCallback(() => {
    setCreateUserInitialRole('barbero');
    setShowCreateUser(false);
    window.requestAnimationFrame(() => createUserButtonRef.current?.focus());
  }, []);

  const handleUserCreated = useCallback((user: PlatformUsuario) => {
    setError(null);
    setDetail((current) =>
      current ? { ...current, usuarios: [...current.usuarios, user] } : current,
    );
    setSuccess('Usuario creado correctamente.');
    closeCreateUserForm();
  }, [closeCreateUserForm]);

  const handleCreateUserError = useCallback((message: string) => {
    setSuccess(null);
    setError(message);
  }, []);

  const changeUserStatus = async (user: PlatformUsuario) => {
    if (!barberiaId) return;
    const nextStatus = !user.activo;

    setUpdatingUserId(user.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setUserActive(barberiaId, user.id, nextStatus);
      if (!mountedRef.current) return;
      setDetail((current) =>
        current
          ? {
              ...current,
              usuarios: current.usuarios.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setSuccess(
        `${user.nombre} fue ${nextStatus ? 'reactivado' : 'desactivado'} correctamente.`,
      );
    } catch (statusError) {
      if (mountedRef.current) setError(errorMessage(statusError));
    } finally {
      if (mountedRef.current) {
        setUpdatingUserId(null);
        setConfirmation(null);
      }
    }
  };

  const changeBarberiaStatus = async () => {
    if (!detail || !barberiaId) return;
    const nextStatus = !detail.barberia.activo;

    setUpdatingBarberia(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setBarberiaActive(barberiaId, nextStatus);
      if (!mountedRef.current) return;
      setDetail((current) =>
        current ? { ...current, barberia: updated } : current,
      );
      setSuccess(
        `${updated.nombre} fue ${nextStatus ? 'reactivada' : 'desactivada'} correctamente.`,
      );
    } catch (statusError) {
      if (mountedRef.current) setError(errorMessage(statusError));
    } finally {
      if (mountedRef.current) {
        setUpdatingBarberia(false);
        setConfirmation(null);
      }
    }
  };

  const handleCopyFeedback = useCallback((feedback: CopyFeedback) => {
    if (feedback.tone === 'success') {
      setError(null);
      setSuccess(feedback.message);
    } else {
      setSuccess(null);
      setError(feedback.message);
    }
  }, []);

  const requestUserStatusChange = useCallback((user: PlatformUsuario) => {
    setConfirmation({ kind: 'user', user, nextStatus: !user.activo });
  }, []);

  if (loading) {
    return (
      <div className="platform-page-loading">
        <LoadingState label="Cargando detalle de la barbería" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="detail-load-error">
        <Card className="border-2 border-red-900 bg-red-50 text-center">
          <Building2 className="mx-auto h-8 w-8 text-red-800" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-black text-red-950">No se pudo cargar la barbería</h1>
          <p className="mt-2 text-sm font-medium text-red-900">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/platform/barberias" className="rounded-lg px-4 py-2 text-sm font-bold text-red-900 hover:bg-red-100">
              Volver al listado
            </Link>
            <Button type="button" size="sm" onClick={() => void loadDetail()}>
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { barberia, usuarios, servicios } = detail;
  const generalPublicUrl = buildPublicBookingUrl(barberia.slug);
  const barberPortals = usuarios.filter(
    (user) => user.rol === 'barbero' && Boolean(user.slug),
  );

  return (
    <div className="platform-detail-page">
      <Link to="/platform/barberias" className="detail-back-link">
        <ArrowLeft aria-hidden="true" />
        Directorio de barberías
      </Link>

      <header className="detail-identity">
        <div className="detail-identity__ambient" aria-hidden="true" />
        <div className="detail-identity__copy">
          <span className="detail-identity__eyebrow">
            <Scissors aria-hidden="true" /> Tenant workspace
          </span>
          <h1>{barberia.nombre}</h1>
          <div className="detail-identity__location">
            <span><MapPin aria-hidden="true" /> {barberia.comuna}</span>
            <code>/b/{barberia.slug}</code>
          </div>
          <div className="detail-identity__metadata">
            <span className={`detail-status-pill${barberia.activo ? ' is-active' : ''}`}>
              <span aria-hidden="true" /> {barberia.activo ? 'Operativa' : 'Inactiva'}
            </span>
            <span>ID {barberia.id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="detail-identity__actions">
          <a href={generalPublicUrl} target="_blank" rel="noreferrer" className="detail-glass-button">
            <ExternalLink aria-hidden="true" /> Abrir portal
          </a>
          <Link to={`/platform/barberias/${barberia.id}/editar`} className="detail-gold-button">
            <Pencil aria-hidden="true" /> Editar tenant
          </Link>
        </div>
      </header>

      <PlatformToast
        toast={toastMessage}
        onDismiss={dismissToast}
      />

      <div className="detail-workbench">
        <aside className="detail-navigation-shell">
          <div className="detail-navigation-shell__heading">
            <span>Secciones</span>
            <small>Explora el tenant</small>
          </div>
          <LineSidebar
            items={detailSections}
            initialActiveId={location.pathname.endsWith('/usuarios') ? 'usuarios' : 'overview'}
          />
        </aside>

        <div className="detail-sections">
          <section id="overview" className="detail-section" aria-labelledby="overview-title">
            <div className="detail-section__heading">
              <div>
                <span className="detail-section__eyebrow">01 / Estado general</span>
                <h2 id="overview-title">Overview</h2>
                <p>Lectura rápida de la estructura y operación actual del tenant.</p>
              </div>
              <Activity aria-hidden="true" />
            </div>

            <div className="detail-stat-grid">
              <article className="detail-stat detail-stat--cyan">
                <span><Users aria-hidden="true" /></span>
                <strong><AnimatedCounter value={summary.users} /></strong>
                <p>Usuarios</p>
                <small>Perfiles asignados</small>
              </article>
              <article className="detail-stat detail-stat--purple">
                <span><Scissors aria-hidden="true" /></span>
                <strong><AnimatedCounter value={summary.barbers} /></strong>
                <p>Barberos</p>
                <small>Perfiles con portal</small>
              </article>
              <article className="detail-stat detail-stat--gold">
                <span><Wrench aria-hidden="true" /></span>
                <strong><AnimatedCounter value={summary.services} /></strong>
                <p>Servicios</p>
                <small>Catálogo configurado</small>
              </article>
            </div>

            <div className="detail-overview-grid">
              <article className="detail-glass-panel">
                <div className="detail-panel-title">
                  <span><Building2 aria-hidden="true" /></span>
                  <div><h3>Identidad del tenant</h3><p>Datos públicos de la barbería</p></div>
                </div>
                <dl className="detail-data-list">
                  <div><dt>Nombre</dt><dd>{barberia.nombre}</dd></div>
                  <div><dt>Comuna</dt><dd>{barberia.comuna}</dd></div>
                  <div><dt>Slug público</dt><dd><code>{barberia.slug}</code></dd></div>
                </dl>
              </article>

              <article className="detail-glass-panel detail-glass-panel--dark">
                <div className="detail-panel-title">
                  <span><ShieldCheck aria-hidden="true" /></span>
                  <div><h3>Señal operativa</h3><p>Disponibilidad registrada</p></div>
                </div>
                <div className="detail-operation-state">
                  <span className={barberia.activo ? 'is-active' : ''} aria-hidden="true" />
                  <div>
                    <strong>{barberia.activo ? 'Tenant activo' : 'Tenant inactivo'}</strong>
                    <p>
                      {barberia.activo
                        ? 'Usuarios y reservas públicas habilitados.'
                        : 'Acceso y nuevas reservas públicas deshabilitados.'}
                    </p>
                  </div>
                </div>
                <time dateTime={barberia.actualizado_en ?? undefined}>
                  Última actualización · {formatDate(barberia.actualizado_en)}
                </time>
              </article>
            </div>
          </section>

          <section id="usuarios" className="detail-section" aria-labelledby="users-title">
            <div className="detail-section__heading detail-section__heading--action">
              <div>
                <span className="detail-section__eyebrow">02 / Acceso</span>
                <h2 id="users-title">Usuarios</h2>
                <p>Administradores y barberos asignados exclusivamente a este tenant.</p>
              </div>
              <Button
                ref={createUserButtonRef}
                type="button"
                disabled={!barberia.activo}
                aria-expanded={showCreateUser}
                aria-controls="create-tenant-user"
                onPointerEnter={() => void loadCreateUserPanel()}
                onFocus={() => void loadCreateUserPanel()}
                onClick={() => {
                  setShowCreateUser(true);
                  setError(null);
                }}
                className="detail-create-user-button"
              >
                <Plus aria-hidden="true" /> Crear usuario
              </Button>
            </div>

            {!barberia.activo && (
              <p className="detail-inline-warning">
                Reactiva la barbería desde Configuración para poder crear nuevos usuarios.
              </p>
            )}

            {showCreateUser && (
              <Suspense
                fallback={(
                  <Card id="create-tenant-user" padding="lg" className="detail-create-user-panel">
                    <LoadingState label="Preparando formulario seguro" compact />
                  </Card>
                )}
              >
                <LazyCreateTenantUserPanel
                  barberiaId={barberia.id}
                  barberiaName={barberia.nombre}
                  barberiaSlug={barberia.slug}
                  initialRole={createUserInitialRole}
                  onCreated={handleUserCreated}
                  onClose={closeCreateUserForm}
                  onError={handleCreateUserError}
                />
              </Suspense>
            )}

            {usuarios.length === 0 ? (
              <div className="detail-empty-panel">
                <EmptyState
                  icon={Users}
                  title="Esta barbería aún no tiene usuarios"
                  description="Crea primero al administrador o agrega un barbero."
                />
              </div>
            ) : (
              <div
                className="detail-table-region"
                role="region"
                aria-label="Usuarios de la barbería; desplázate horizontalmente para ver todas las columnas"
                tabIndex={0}
              >
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Slug / enlace público</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((user) => (
                      <PlatformUserRow
                        key={user.id}
                        user={user}
                        barberiaSlug={barberia.slug}
                        updating={updatingUserId === user.id}
                        onCopyFeedback={handleCopyFeedback}
                        onRequestToggle={requestUserStatusChange}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section id="servicios" className="detail-section" aria-labelledby="services-title">
            <div className="detail-section__heading">
              <div>
                <span className="detail-section__eyebrow">03 / Catálogo</span>
                <h2 id="services-title">Servicios</h2>
                <p>Resumen del catálogo configurado desde el dashboard del tenant.</p>
              </div>
              <Wrench aria-hidden="true" />
            </div>

            {servicios.length === 0 ? (
              <div className="detail-empty-panel">
                <EmptyState
                  icon={Wrench}
                  title="Sin servicios configurados"
                  description="El administrador de la barbería podrá crear su catálogo desde el dashboard."
                />
              </div>
            ) : (
              <div className="detail-services-grid">
                {servicios.map((servicio, index) => (
                  <article key={servicio.id} className="detail-service-card">
                    <div className="detail-service-card__index">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <Scissors aria-hidden="true" />
                    </div>
                    <h3>{servicio.nombre}</h3>
                    <div className="detail-service-card__footer">
                      <span>{servicio.duracion} minutos</span>
                      <strong>{currencyFormatter.format(servicio.precio)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="portal" className="detail-section" aria-labelledby="portal-title">
            <div className="detail-section__heading">
              <div>
                <span className="detail-section__eyebrow">04 / Experiencia pública</span>
                <h2 id="portal-title">Portal</h2>
                <p>Accesos públicos generales e individuales disponibles para reservas.</p>
              </div>
              <Globe2 aria-hidden="true" />
            </div>

            <article className="detail-portal-card">
              <div className="detail-portal-card__halo" aria-hidden="true" />
              <div className="detail-portal-card__heading">
                <span><Globe2 aria-hidden="true" /></span>
                <div><small>Portal general</small><h3>{barberia.nombre}</h3></div>
                <span className={`detail-status-pill${barberia.activo ? ' is-active' : ''}`}>
                  {barberia.activo ? 'Disponible' : 'Pausado'}
                </span>
              </div>
              <div className="detail-url-field">
                <code>{generalPublicUrl}</code>
                <div>
                  <CopyButton
                    value={generalPublicUrl}
                    subject={barberia.nombre}
                    showLabel
                    onFeedback={handleCopyFeedback}
                  />
                  <a href={generalPublicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" /> Abrir
                  </a>
                </div>
              </div>
              {!barberia.activo && (
                <p className="detail-portal-card__warning">
                  El portal no acepta reservas mientras la barbería está inactiva.
                </p>
              )}
            </article>

            <div className="detail-portal-directory">
              <div className="detail-portal-directory__heading">
                <div>
                  <h3>Portales de barberos</h3>
                  <p>{barberPortals.length} enlaces individuales configurados.</p>
                </div>
                <Scissors aria-hidden="true" />
              </div>
              {barberPortals.length === 0 ? (
                <p className="detail-portal-directory__empty">No hay enlaces individuales disponibles.</p>
              ) : (
                <ul>
                  {barberPortals.map((user) => {
                    const url = buildPublicBookingUrl(barberia.slug, user.slug ?? undefined);
                    return (
                      <li key={user.id}>
                        <span><strong>{user.nombre}</strong><code>/{user.slug}</code></span>
                        <span>
                          <CopyButton
                            value={url}
                            subject={user.nombre}
                            onFeedback={handleCopyFeedback}
                          />
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Abrir enlace público de ${user.nombre}`}
                          >
                            <ExternalLink aria-hidden="true" />
                          </a>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section id="configuracion" className="detail-section" aria-labelledby="configuration-title">
            <div className="detail-section__heading">
              <div>
                <span className="detail-section__eyebrow">05 / Administración</span>
                <h2 id="configuration-title">Configuración</h2>
                <p>Identidad técnica, fechas de registro y control de disponibilidad.</p>
              </div>
              <Settings2 aria-hidden="true" />
            </div>

            <div className="detail-configuration-grid">
              <article className="detail-glass-panel">
                <div className="detail-panel-title">
                  <span><CalendarClock aria-hidden="true" /></span>
                  <div><h3>Metadata del registro</h3><p>Información persistida en plataforma</p></div>
                </div>
                <dl className="detail-config-data">
                  <div><dt>Identificador</dt><dd><code>{barberia.id}</code></dd></div>
                  <div><dt>Creada</dt><dd>{formatDate(barberia.creado_en)}</dd></div>
                  <div><dt>Última actualización</dt><dd>{formatDate(barberia.actualizado_en)}</dd></div>
                </dl>
                <Link to={`/platform/barberias/${barberia.id}/editar`} className="detail-config-edit">
                  <Pencil aria-hidden="true" /> Editar nombre, comuna y slug
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </article>

              <article className={`detail-danger-panel${barberia.activo ? '' : ' is-inactive'}`}>
                <div className="detail-danger-panel__heading">
                  <span><Power aria-hidden="true" /></span>
                  <div>
                    <h3>{barberia.activo ? 'Desactivar tenant' : 'Reactivar tenant'}</h3>
                    <p>
                      {barberia.activo
                        ? 'Bloquea el inicio de sesión y detiene nuevas reservas públicas.'
                        : 'Restablece los accesos y la disponibilidad del portal público.'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={barberia.activo ? 'danger' : 'secondary'}
                  disabled={updatingBarberia}
                  onClick={() =>
                    setConfirmation({ kind: 'barberia', nextStatus: !barberia.activo })
                  }
                >
                  {updatingBarberia ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {barberia.activo ? 'Desactivar barbería' : 'Reactivar barbería'}
                </Button>
              </article>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmation !== null}
        title={
          confirmation?.kind === 'user'
            ? `${confirmation.nextStatus ? 'Reactivar' : 'Desactivar'} a ${confirmation.user.nombre}`
            : `${confirmation?.nextStatus ? 'Reactivar' : 'Desactivar'} ${barberia.nombre}`
        }
        description={
          confirmation?.kind === 'user'
            ? confirmation.nextStatus
              ? 'El usuario recuperará el acceso al tenant con sus credenciales actuales.'
              : 'Ya no podrá iniciar sesión, pero su perfil y su historial se conservarán.'
            : confirmation?.nextStatus
              ? 'Se restablecerán los accesos y la disponibilidad del portal público.'
              : 'Los usuarios no podrán iniciar sesión y no se aceptarán nuevas reservas públicas.'
        }
        confirmLabel={confirmation?.nextStatus ? 'Sí, reactivar' : 'Sí, desactivar'}
        tone={confirmation?.nextStatus ? 'positive' : 'danger'}
        busy={
          confirmation?.kind === 'user'
            ? updatingUserId === confirmation.user.id
            : updatingBarberia
        }
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation?.kind === 'user') void changeUserStatus(confirmation.user);
          if (confirmation?.kind === 'barberia') void changeBarberiaStatus();
        }}
      />
    </div>
  );
}

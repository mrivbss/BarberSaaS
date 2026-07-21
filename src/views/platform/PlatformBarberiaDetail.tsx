import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Power,
  Scissors,
  Store,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui';
import { buildPublicBookingUrl, normalizeSlug, validateSlug } from '../../lib/slug';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformBarberiaDetail as BarberiaDetail,
  type PlatformUsuario,
  type TenantUserRole,
} from '../../services/platformAdmin';

interface CreateUserForm {
  nombre: string;
  email: string;
  rol: TenantUserRole;
  slug: string;
  password: string;
  passwordConfirmation: string;
}

interface CreateUserErrors {
  nombre?: string;
  email?: string;
  slug?: string;
  password?: string;
  passwordConfirmation?: string;
}

interface NavigationState {
  notice?: string;
  openCreateUser?: boolean;
}

const initialCreateUserForm: CreateUserForm = {
  nombre: '',
  email: '',
  rol: 'barbero',
  slug: '',
  password: '',
  passwordConfirmation: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function PlatformBarberiaDetail() {
  const { barberiaId } = useParams<{ barberiaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as NavigationState | null;
  const [detail, setDetail] = useState<BarberiaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(navigationState?.notice ?? null);
  const [showCreateUser, setShowCreateUser] = useState(navigationState?.openCreateUser === true);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>(() =>
    navigationState?.openCreateUser
      ? { ...initialCreateUserForm, rol: 'admin' }
      : initialCreateUserForm,
  );
  const [createUserErrors, setCreateUserErrors] = useState<CreateUserErrors>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingBarberia, setUpdatingBarberia] = useState(false);
  const createUserButtonRef = useRef<HTMLButtonElement>(null);
  const createUserInFlight = useRef(false);

  const loadDetail = useCallback(async () => {
    if (!barberiaId) {
      setError('La barbería solicitada no es válida.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await platformAdmin.getBarberia(barberiaId);
      setDetail(nextDetail);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [barberiaId]);

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

  const summary = useMemo(() => {
    const usuarios = detail?.usuarios ?? [];
    return {
      users: usuarios.length,
      barbers: usuarios.filter((user) => user.rol === 'barbero').length,
      services: detail?.servicios.length ?? 0,
    };
  }, [detail]);

  const closeCreateUserForm = () => {
    setCreateUserForm(initialCreateUserForm);
    setCreateUserErrors({});
    setSlugEdited(false);
    setShowCreateUser(false);
    window.requestAnimationFrame(() => createUserButtonRef.current?.focus());
  };

  const validateCreateUser = (): boolean => {
    const nextErrors: CreateUserErrors = {};
    if (!createUserForm.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (createUserForm.nombre.trim().length > 120) {
      nextErrors.nombre = 'Usa un máximo de 120 caracteres.';
    }
    if (!emailPattern.test(createUserForm.email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }
    if (createUserForm.rol === 'barbero') {
      const slugError = validateSlug(createUserForm.slug);
      if (slugError) nextErrors.slug = slugError;
    }
    if (createUserForm.password.length < minimumPasswordLength) {
      nextErrors.password = `La contraseña debe tener al menos ${minimumPasswordLength} caracteres.`;
    }
    if (!createUserForm.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'Confirma la contraseña.';
    } else if (createUserForm.password !== createUserForm.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'Las contraseñas no coinciden.';
    }
    setCreateUserErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createUser = async () => {
    if (createUserInFlight.current || !barberiaId || !validateCreateUser()) return;

    createUserInFlight.current = true;
    setCreatingUser(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await platformAdmin.createTenantUser({
        barberia_id: barberiaId,
        nombre: createUserForm.nombre.trim(),
        email: createUserForm.email.trim().toLowerCase(),
        rol: createUserForm.rol,
        password: createUserForm.password,
        ...(createUserForm.rol === 'barbero' && slugEdited
          ? { slug: createUserForm.slug }
          : {}),
      });
      const created = result.usuario;
      setDetail((current) =>
        current ? { ...current, usuarios: [...current.usuarios, created] } : current,
      );
      setSuccess('Usuario creado correctamente.');
      closeCreateUserForm();
    } catch (createError) {
      if (createError instanceof PlatformAdminError) {
        if (createError.code === 'duplicate_barber_slug') {
          setCreateUserErrors((current) => ({ ...current, slug: createError.message }));
        }
        if (createError.code === 'duplicate_email') {
          setCreateUserErrors((current) => ({ ...current, email: createError.message }));
        }
        if (createError.code === 'password_too_short' || createError.code === 'password_policy') {
          setCreateUserErrors((current) => ({ ...current, password: createError.message }));
        }
      }
      setError(errorMessage(createError));
    } finally {
      createUserInFlight.current = false;
      setCreatingUser(false);
    }
  };

  const submitCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createUser();
  };

  const changeUserStatus = async (user: PlatformUsuario) => {
    if (!barberiaId) return;
    const nextStatus = !user.activo;
    const confirmed = window.confirm(
      `¿Confirmas que deseas ${nextStatus ? 'reactivar' : 'desactivar'} a ${user.nombre}?${
        nextStatus ? '' : ' Ya no podrá iniciar sesión, pero su historial se conservará.'
      }`,
    );
    if (!confirmed) return;

    setUpdatingUserId(user.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setUserActive(barberiaId, user.id, nextStatus);
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
      setError(errorMessage(statusError));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const changeBarberiaStatus = async () => {
    if (!detail || !barberiaId) return;
    const nextStatus = !detail.barberia.activo;
    const confirmed = window.confirm(
      `¿Confirmas que deseas ${nextStatus ? 'reactivar' : 'desactivar'} “${
        detail.barberia.nombre
      }”?${
        nextStatus
          ? ''
          : ' Sus usuarios no podrán iniciar sesión y no se aceptarán nuevas reservas públicas.'
      }`,
    );
    if (!confirmed) return;

    setUpdatingBarberia(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setBarberiaActive(barberiaId, nextStatus);
      setDetail((current) =>
        current ? { ...current, barberia: updated } : current,
      );
      setSuccess(
        `${updated.nombre} fue ${nextStatus ? 'reactivada' : 'desactivada'} correctamente.`,
      );
    } catch (statusError) {
      setError(errorMessage(statusError));
    } finally {
      setUpdatingBarberia(false);
    }
  };

  const copyUrl = async (url: string, label: string) => {
    setError(null);
    setSuccess(null);
    try {
      await navigator.clipboard.writeText(url);
      setSuccess(`Enlace público de ${label} copiado al portapapeles.`);
    } catch {
      setError(`No se pudo copiar automáticamente. Copia este enlace: ${url}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8" role="status">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando detalle de la barbería...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl p-5 sm:p-8 lg:p-10">
        <Card className="border-2 border-red-900 bg-red-50 text-center">
          <Building2 className="mx-auto h-8 w-8 text-red-800" />
          <h1 className="mt-4 text-xl font-black text-red-950">No se pudo cargar la barbería</h1>
          <p className="mt-2 text-sm font-medium text-red-900">{error}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/platform/barberias"
              className="rounded-lg px-4 py-2 text-sm font-bold text-red-900 hover:bg-red-100"
            >
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

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8 lg:p-10">
      <Link
        to="/platform/barberias"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas las barberías
      </Link>

      <PageHeader
        title={barberia.nombre}
        subtitle={`${barberia.comuna} · /b/${barberia.slug}`}
        badge={
          <Badge variant={barberia.activo ? 'success' : 'warning'}>
            {barberia.activo ? 'Activa' : 'Inactiva'}
          </Badge>
        }
        action={
          <Link
            to={`/platform/barberias/${barberia.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        }
        className="mb-0"
      />

      {error && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border-2 border-red-900 bg-red-50 p-4 text-sm font-semibold text-red-900">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-start justify-between gap-4 rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <span className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            {success}
          </span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Cerrar mensaje">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={Users} value={summary.users} label="Usuarios" subtext="Perfiles del tenant" />
        <StatCard icon={Scissors} value={summary.barbers} label="Barberos" subtext="Enlaces individuales" />
        <StatCard icon={Wrench} value={summary.services} label="Servicios" subtext="Catálogo disponible" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card padding="lg" className="border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">Información general</h2>
                <p className="text-xs text-slate-500">Datos y estado del tenant</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={barberia.activo ? 'danger' : 'secondary'}
              disabled={updatingBarberia}
              onClick={() => void changeBarberiaStatus()}
            >
              {updatingBarberia ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {barberia.activo ? 'Desactivar' : 'Reactivar'}
            </Button>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Nombre</dt>
              <dd className="mt-1 text-sm font-bold text-slate-950">{barberia.nombre}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Comuna</dt>
              <dd className="mt-1 text-sm font-bold text-slate-950">{barberia.comuna}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Slug</dt>
              <dd className="mt-1 font-mono text-sm font-bold text-slate-950">{barberia.slug}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Identificador</dt>
              <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-700">{barberia.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Creada</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700">{formatDate(barberia.creado_en)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">Última actualización</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700">{formatDate(barberia.actualizado_en)}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="lg" className="border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">Portal público</h2>
              <p className="text-xs text-slate-500">Reserva general de la barbería</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="break-all font-mono text-xs font-bold text-slate-800">{generalPublicUrl}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void copyUrl(generalPublicUrl, barberia.nombre)}
              >
                <Clipboard className="h-4 w-4" />
                Copiar enlace
              </Button>
              <a
                href={generalPublicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-950"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir portal
              </a>
            </div>
          </div>

          {!barberia.activo && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              El portal no acepta reservas mientras la barbería está inactiva.
            </p>
          )}
        </Card>
      </div>

      <section className="space-y-4" id="usuarios">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Usuarios</h2>
            <p className="mt-1 text-sm text-slate-500">
              Administradores y barberos asignados exclusivamente a este tenant.
            </p>
          </div>
          <Button
            ref={createUserButtonRef}
            type="button"
            disabled={!barberia.activo}
            onClick={() => {
              setShowCreateUser(true);
              setError(null);
            }}
            className="bg-slate-950 text-white"
          >
            <Plus className="h-4 w-4" />
            Crear usuario
          </Button>
        </div>

        {!barberia.activo && (
          <p className="text-xs font-semibold text-amber-800">
            Reactiva la barbería para poder crear nuevos usuarios.
          </p>
        )}

        {showCreateUser && (
          <Card padding="lg" className="border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-950">Crear usuario</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea las credenciales de acceso para este usuario en {barberia.nombre}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateUserForm}
                aria-label="Cerrar formulario"
                disabled={creatingUser}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={submitCreateUser} noValidate className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Nombre"
                  value={createUserForm.nombre}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Nombre completo"
                  error={createUserErrors.nombre}
                  autoFocus
                  disabled={creatingUser}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setCreateUserForm((current) => ({
                      ...current,
                      nombre: nextName,
                      slug:
                        current.rol === 'barbero' && !slugEdited
                          ? normalizeSlug(nextName)
                          : current.slug,
                    }));
                    if (createUserErrors.nombre) {
                      setCreateUserErrors((current) => ({ ...current, nombre: undefined }));
                    }
                  }}
                />
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={createUserForm.email}
                  maxLength={254}
                  autoComplete="email"
                  placeholder="persona@ejemplo.cl"
                  error={createUserErrors.email}
                  disabled={creatingUser}
                  onChange={(event) => {
                    setCreateUserForm((current) => ({ ...current, email: event.target.value }));
                    if (createUserErrors.email) {
                      setCreateUserErrors((current) => ({ ...current, email: undefined }));
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tenant-role" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Rol
                  </label>
                  <select
                    id="tenant-role"
                    value={createUserForm.rol}
                    disabled={creatingUser}
                    onChange={(event) => {
                      const rol = event.target.value as TenantUserRole;
                      setCreateUserForm((current) => ({
                        ...current,
                        rol,
                        slug: rol === 'barbero' ? normalizeSlug(current.nombre) : '',
                      }));
                      setSlugEdited(false);
                      setCreateUserErrors((current) => ({ ...current, slug: undefined }));
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-input outline-none focus:border-slate-950 focus:shadow-input-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="barbero">Barbero</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    No es posible crear superadministradores desde esta interfaz.
                  </p>
                </div>

                {createUserForm.rol === 'barbero' && (
                  <Input
                    label="Slug del barbero"
                    value={createUserForm.slug}
                    maxLength={120}
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder="nombre-barbero"
                    error={createUserErrors.slug}
                    disabled={creatingUser}
                    onChange={(event) => {
                      setCreateUserForm((current) => ({
                        ...current,
                        slug: normalizeSlug(event.target.value),
                      }));
                      setSlugEdited(true);
                      if (createUserErrors.slug) {
                        setCreateUserErrors((current) => ({ ...current, slug: undefined }));
                      }
                    }}
                  />
                )}
              </div>

              {createUserForm.rol === 'barbero' && createUserForm.slug && (
                <p className="rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-600">
                  Enlace individual:{' '}
                  <span className="break-all font-mono font-bold text-slate-900">
                    {buildPublicBookingUrl(barberia.slug, createUserForm.slug)}
                  </span>
                </p>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <Input
                    id="initial-password"
                    label="Contraseña inicial"
                    type="password"
                    value={createUserForm.password}
                    minLength={minimumPasswordLength}
                    autoComplete="new-password"
                    required
                    aria-describedby="initial-password-requirements"
                    error={createUserErrors.password}
                    disabled={creatingUser}
                    onChange={(event) => {
                      setCreateUserForm((current) => ({ ...current, password: event.target.value }));
                      if (createUserErrors.password) {
                        setCreateUserErrors((current) => ({ ...current, password: undefined }));
                      }
                    }}
                  />
                  <p id="initial-password-requirements" className="mt-1 text-[11px] text-slate-500">
                    Usa al menos {minimumPasswordLength} caracteres y entrégala al usuario por un canal seguro.
                  </p>
                </div>
                <Input
                  id="initial-password-confirmation"
                  label="Confirmar contraseña"
                  type="password"
                  value={createUserForm.passwordConfirmation}
                  minLength={minimumPasswordLength}
                  autoComplete="new-password"
                  required
                  error={createUserErrors.passwordConfirmation}
                  disabled={creatingUser}
                  onChange={(event) => {
                    setCreateUserForm((current) => ({
                      ...current,
                      passwordConfirmation: event.target.value,
                    }));
                    if (createUserErrors.passwordConfirmation) {
                      setCreateUserErrors((current) => ({
                        ...current,
                        passwordConfirmation: undefined,
                      }));
                    }
                  }}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeCreateUserForm}
                  disabled={creatingUser}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingUser} className="bg-slate-950 text-white">
                  {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creatingUser ? 'Creando usuario...' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {usuarios.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <EmptyState
              icon={Users}
              title="Esta barbería aún no tiene usuarios"
              description="Crea primero al administrador o agrega un barbero."
            />
          </div>
        ) : (
          <div className="[&>div]:overflow-x-auto">
            <Table className="min-w-[900px]">
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
                {usuarios.map((user) => {
                  const barberUrl =
                    user.rol === 'barbero' && user.slug
                      ? buildPublicBookingUrl(barberia.slug, user.slug)
                      : null;
                  return (
                    <TableRow key={user.id}>
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
                          <div className="flex items-center gap-2">
                            <code className="max-w-[220px] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                              {user.slug}
                            </code>
                            <button
                              type="button"
                              onClick={() => void copyUrl(barberUrl, user.nombre)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                              aria-label={`Copiar enlace público de ${user.nombre}`}
                              title="Copiar enlace público"
                            >
                              <Clipboard className="h-4 w-4" />
                            </button>
                            <a
                              href={barberUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                              aria-label={`Abrir enlace público de ${user.nombre}`}
                              title="Abrir enlace público"
                            >
                              <ExternalLink className="h-4 w-4" />
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
                          disabled={updatingUserId === user.id}
                          onClick={() => void changeUserStatus(user)}
                        >
                          {updatingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                          {user.activo ? 'Desactivar' : 'Reactivar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Servicios</h2>
          <p className="mt-1 text-sm text-slate-500">Resumen del catálogo configurado por el tenant.</p>
        </div>

        {servicios.length === 0 ? (
          <Card className="border-2 border-slate-900">
            <EmptyState
              icon={Wrench}
              title="Sin servicios configurados"
              description="El administrador de la barbería podrá crear su catálogo desde el dashboard."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {servicios.map((servicio) => (
              <Card key={servicio.id} padding="sm" className="border-2 border-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{servicio.nombre}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {servicio.duracion} minutos
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-mono text-sm font-black text-slate-950">
                    {currencyFormatter.format(servicio.precio)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

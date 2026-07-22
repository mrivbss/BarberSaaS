import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  ExternalLink,
  Eye,
  Layers3,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildPublicBookingUrl } from '../../lib/slug';
import { useMountedRef } from '../../hooks/useMountedRef';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformBarberiaSummary,
} from '../../services/platformAdmin';
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '../../components/ui';
import { ConfirmDialog, PlatformToast } from '../../components/platform/polish';

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudieron cargar las barberías.';
}

interface BarberiaRowProps {
  barberia: PlatformBarberiaSummary;
  updating: boolean;
  onRequestStatusChange: (barberia: PlatformBarberiaSummary) => void;
}

const PlatformBarberiaRow = memo(function PlatformBarberiaRow({
  barberia,
  updating,
  onRequestStatusChange,
}: BarberiaRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="platform-directory-tenant">
          <span className="platform-directory-tenant__mark" aria-hidden="true">
            <Building2 />
          </span>
          <span className="platform-directory-tenant__copy">
            <Link to={`/platform/barberias/${barberia.id}`}>{barberia.nombre}</Link>
            <small>{barberia.comuna}</small>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <code className="platform-directory-slug">
          /{barberia.slug}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant={barberia.activo ? 'success' : 'warning'}>
          {barberia.activo ? 'Activa' : 'Inactiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-center font-mono font-black text-slate-900">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {barberia.usuarios_count}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono font-black text-slate-900">
        <span className="inline-flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {barberia.barberos_count}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono font-black text-slate-900">
        {barberia.servicios_count}
      </TableCell>
      <TableCell>
        <div className="platform-directory-actions">
          <a
            href={buildPublicBookingUrl(barberia.slug)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            title="Abrir portal público"
            aria-label={`Abrir portal público de ${barberia.nombre}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            to={`/platform/barberias/${barberia.id}`}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            title="Ver detalle"
            aria-label={`Ver detalle de ${barberia.nombre}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to={`/platform/barberias/${barberia.id}/editar`}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            title="Editar"
            aria-label={`Editar ${barberia.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onRequestStatusChange(barberia)}
            disabled={updating}
            className={
              barberia.activo
                ? 'rounded-lg p-2 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40'
                : 'rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-40'
            }
            title={barberia.activo ? 'Desactivar' : 'Reactivar'}
            aria-label={`${barberia.activo ? 'Desactivar' : 'Reactivar'} ${barberia.nombre}`}
          >
            {updating ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Power className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export function PlatformBarberias() {
  const mountedRef = useMountedRef();
  const [barberias, setBarberias] = useState<PlatformBarberiaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingBarberia, setPendingBarberia] = useState<PlatformBarberiaSummary | null>(null);

  const requestStatusChange = useCallback((barberia: PlatformBarberiaSummary) => {
    setPendingBarberia(barberia);
  }, []);

  const successToast = useMemo(
    () => (success ? { id: 1, tone: 'success' as const, message: success } : null),
    [success],
  );

  const directoryMetrics = useMemo(
    () => ({
      total: barberias.length,
      active: barberias.filter((barberia) => barberia.activo).length,
      users: barberias.reduce((total, barberia) => total + barberia.usuarios_count, 0),
      barbers: barberias.reduce((total, barberia) => total + barberia.barberos_count, 0),
      services: barberias.reduce((total, barberia) => total + barberia.servicios_count, 0),
    }),
    [barberias],
  );

  const dismissSuccess = useCallback(() => setSuccess(null), []);

  const loadBarberias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdmin.listBarberias();
      if (mountedRef.current) setBarberias(result);
    } catch (loadError) {
      if (mountedRef.current) setError(errorMessage(loadError));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    document.title = 'Barberías | BarberSaaS';
    void loadBarberias();
  }, [loadBarberias]);

  const changeStatus = async (barberia: PlatformBarberiaSummary) => {
    const nextStatus = !barberia.activo;

    setUpdatingId(barberia.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setBarberiaActive(barberia.id, nextStatus);
      if (!mountedRef.current) return;
      setBarberias((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSuccess(
        `${barberia.nombre} fue ${nextStatus ? 'reactivada' : 'desactivada'} correctamente.`,
      );
    } catch (statusError) {
      if (mountedRef.current) setError(errorMessage(statusError));
    } finally {
      if (mountedRef.current) {
        setUpdatingId(null);
        setPendingBarberia(null);
      }
    }
  };

  return (
    <div className="platform-directory-page">
      <section className="platform-directory-hero" aria-labelledby="directory-title">
        <div className="platform-directory-hero__ambient" aria-hidden="true" />
        <div className="platform-directory-hero__copy">
          <span className="platform-directory-eyebrow">
            <Activity aria-hidden="true" /> Directorio operativo
          </span>
          <h1 id="directory-title">Barberías</h1>
          <p>
            Administra los tenants, sus accesos y portales públicos desde una sola superficie.
          </p>
          <Link to="/platform/barberias/nueva" className="platform-directory-create">
            <Plus aria-hidden="true" /> Nueva barbería
          </Link>
        </div>

        <div className="platform-directory-metrics" aria-busy={loading} aria-label="Resumen del directorio">
          <article>
            <span><Building2 aria-hidden="true" /></span>
            <div><small>Tenants</small><strong>{loading ? '—' : directoryMetrics.total}</strong></div>
          </article>
          <article>
            <span><ShieldCheck aria-hidden="true" /></span>
            <div><small>Operativos</small><strong>{loading ? '—' : directoryMetrics.active}</strong></div>
          </article>
          <article>
            <span><Users aria-hidden="true" /></span>
            <div>
              <small>Usuarios</small>
              <strong>{loading ? '—' : directoryMetrics.users}</strong>
              <em>{loading ? 'Sincronizando' : `${directoryMetrics.barbers} barberos`}</em>
            </div>
          </article>
          <article>
            <span><Layers3 aria-hidden="true" /></span>
            <div><small>Servicios</small><strong>{loading ? '—' : directoryMetrics.services}</strong></div>
          </article>
        </div>
      </section>

      {error && (
        <div role="alert" className="platform-directory-alert">
          <span>{error}</span>
          <Button type="button" size="sm" variant="danger" onClick={() => void loadBarberias()}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      )}

      <PlatformToast
        toast={successToast}
        onDismiss={dismissSuccess}
      />

      <section className="platform-directory-section" aria-labelledby="directory-list-title">
        <div className="platform-directory-section__heading">
          <div>
            <span>Inventario de plataforma</span>
            <h2 id="directory-list-title">Directorio de tenants</h2>
            <p>Accede a la configuración, disponibilidad y portal de cada barbería.</p>
          </div>
          <span className="platform-directory-count">
            {loading ? 'Sincronizando' : `${barberias.length} ${barberias.length === 1 ? 'registro' : 'registros'}`}
          </span>
        </div>

        {!loading && !error && barberias.length === 0 ? (
          <div className="platform-directory-empty">
            <EmptyState
              icon={Building2}
              title="Aún no hay barberías"
              description="Crea el primer tenant para comenzar a agregar administradores y barberos."
              action={
                <Link to="/platform/barberias/nueva" className="platform-directory-empty__action">
                  <Plus aria-hidden="true" /> Crear barbería
                </Link>
              }
            />
          </div>
        ) : (
          <div
            className="platform-directory-table-region"
            aria-busy={loading}
            role="region"
            aria-label="Directorio de barberías; desplázate horizontalmente para ver todas las columnas"
            tabIndex={0}
          >
            <Table className="min-w-[1050px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Barbería</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-center">Barberos</TableHead>
                  <TableHead className="text-center">Servicios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : (
                  barberias.map((barberia) => (
                    <PlatformBarberiaRow
                      key={barberia.id}
                      barberia={barberia}
                      updating={updatingId === barberia.id}
                      onRequestStatusChange={requestStatusChange}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingBarberia !== null}
        title={`${pendingBarberia?.activo ? 'Desactivar' : 'Reactivar'} ${pendingBarberia?.nombre ?? 'barbería'}`}
        description={
          pendingBarberia?.activo
            ? 'Sus usuarios no podrán iniciar sesión y su portal público quedará inactivo.'
            : 'Se restablecerán los accesos y la disponibilidad del portal público.'
        }
        confirmLabel={pendingBarberia?.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
        tone={pendingBarberia?.activo ? 'danger' : 'positive'}
        busy={pendingBarberia ? updatingId === pendingBarberia.id : false}
        onCancel={() => setPendingBarberia(null)}
        onConfirm={() => {
          if (pendingBarberia) void changeStatus(pendingBarberia);
        }}
      />
    </div>
  );
}

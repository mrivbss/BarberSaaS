import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Scissors,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildPublicBookingUrl } from '../../lib/slug';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformBarberiaSummary,
} from '../../services/platformAdmin';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '../../components/ui';

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudieron cargar las barberías.';
}

export function PlatformBarberias() {
  const [barberias, setBarberias] = useState<PlatformBarberiaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBarberias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBarberias(await platformAdmin.listBarberias());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Barberías | BarberSaaS';
    void loadBarberias();
  }, [loadBarberias]);

  const changeStatus = async (barberia: PlatformBarberiaSummary) => {
    const nextStatus = !barberia.activo;
    const verb = nextStatus ? 'reactivar' : 'desactivar';
    const confirmed = window.confirm(
      `¿Confirmas que deseas ${verb} “${barberia.nombre}”?${
        nextStatus
          ? ''
          : ' Sus usuarios no podrán iniciar sesión y su portal público quedará inactivo.'
      }`,
    );
    if (!confirmed) return;

    setUpdatingId(barberia.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await platformAdmin.setBarberiaActive(barberia.id, nextStatus);
      setBarberias((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSuccess(
        `${barberia.nombre} fue ${nextStatus ? 'reactivada' : 'desactivada'} correctamente.`,
      );
    } catch (statusError) {
      setError(errorMessage(statusError));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8 lg:p-10">
      <PageHeader
        title="Barberías"
        subtitle="Administra los tenants, sus accesos y portales públicos."
        action={
          <Link
            to="/platform/barberias/nueva"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all hover:-translate-y-0.5 hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Nueva barbería
          </Link>
        }
        className="mb-0"
      />

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border-2 border-red-900 bg-red-50 p-4 text-sm font-semibold text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button type="button" size="sm" variant="danger" onClick={() => void loadBarberias()}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {success}
        </div>
      )}

      {!loading && !error && barberias.length === 0 ? (
        <div className="rounded-xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
          <EmptyState
            icon={Building2}
            title="Aún no hay barberías"
            description="Crea el primer tenant para comenzar a agregar administradores y barberos."
            action={
              <Link
                to="/platform/barberias/nueva"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Crear barbería
              </Link>
            }
          />
        </div>
      ) : (
        <div className="pb-1 [&>div]:overflow-x-auto">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow>
                <TableHead>Barbería</TableHead>
                <TableHead>Slug</TableHead>
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
                  <TableRow key={barberia.id}>
                    <TableCell>
                      <Link
                        to={`/platform/barberias/${barberia.id}`}
                        className="font-black text-slate-950 hover:underline"
                      >
                        {barberia.nombre}
                      </Link>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {barberia.comuna}
                      </p>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {barberia.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={barberia.activo ? 'success' : 'warning'}>
                        {barberia.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-slate-900">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {barberia.usuarios_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-slate-900">
                      <span className="inline-flex items-center gap-1.5">
                        <Scissors className="h-3.5 w-3.5 text-slate-400" />
                        {barberia.barberos_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-slate-900">
                      {barberia.servicios_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={buildPublicBookingUrl(barberia.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                          title="Abrir portal público"
                          aria-label={`Abrir portal público de ${barberia.nombre}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                          to={`/platform/barberias/${barberia.id}`}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                          title="Ver detalle"
                          aria-label={`Ver detalle de ${barberia.nombre}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/platform/barberias/${barberia.id}/editar`}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                          title="Editar"
                          aria-label={`Editar ${barberia.nombre}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void changeStatus(barberia)}
                          disabled={updatingId === barberia.id}
                          className={
                            barberia.activo
                              ? 'rounded-lg p-2 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40'
                              : 'rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-40'
                          }
                          title={barberia.activo ? 'Desactivar' : 'Reactivar'}
                          aria-label={`${barberia.activo ? 'Desactivar' : 'Reactivar'} ${barberia.nombre}`}
                        >
                          {updatingId === barberia.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

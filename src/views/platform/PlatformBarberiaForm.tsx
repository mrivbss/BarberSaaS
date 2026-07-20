import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Building2, ExternalLink, Loader2, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, PageHeader } from '../../components/ui';
import { buildPublicBookingUrl, normalizeSlug, validateSlug } from '../../lib/slug';
import { PlatformAdminError, platformAdmin } from '../../services/platformAdmin';

interface FieldErrors {
  nombre?: string;
  comuna?: string;
  slug?: string;
}

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo guardar la barbería. Inténtalo nuevamente.';
}

export function PlatformBarberiaForm() {
  const { barberiaId } = useParams<{ barberiaId: string }>();
  const editing = Boolean(barberiaId);
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [comuna, setComuna] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBarberia = useCallback(async () => {
    if (!barberiaId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await platformAdmin.getBarberia(barberiaId);
      setNombre(detail.barberia.nombre);
      setComuna(detail.barberia.comuna);
      setSlug(detail.barberia.slug);
      setSlugEdited(true);
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, [barberiaId]);

  useEffect(() => {
    document.title = `${editing ? 'Editar' : 'Nueva'} barbería | BarberSaaS`;
    if (editing) void loadBarberia();
  }, [editing, loadBarberia]);

  const validate = (): boolean => {
    const nextErrors: FieldErrors = {};
    if (!nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (nombre.trim().length > 120) nextErrors.nombre = 'Usa un máximo de 120 caracteres.';
    if (!comuna.trim()) nextErrors.comuna = 'La comuna es obligatoria.';
    if (comuna.trim().length > 120) nextErrors.comuna = 'Usa un máximo de 120 caracteres.';
    const slugError = validateSlug(slug);
    if (slugError) nextErrors.slug = slugError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const input = {
        nombre: nombre.trim(),
        comuna: comuna.trim(),
        slug,
      };
      const saved = barberiaId
        ? await platformAdmin.updateBarberia(barberiaId, input)
        : await platformAdmin.createBarberia(input);

      navigate(`/platform/barberias/${saved.id}`, {
        replace: true,
        state: {
          notice: barberiaId
            ? 'La barbería se actualizó correctamente.'
            : 'La barbería fue creada. Ya puedes invitar a su primer administrador.',
          openInvite: !barberiaId,
        },
      });
    } catch (saveError) {
      if (
        saveError instanceof PlatformAdminError &&
        saveError.code === 'duplicate_barberia_slug'
      ) {
        setFieldErrors((current) => ({ ...current, slug: saveError.message }));
      }
      setError(messageFromError(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8" role="status">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando barbería...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8 lg:p-10">
      <Link
        to={barberiaId ? `/platform/barberias/${barberiaId}` : '/platform/barberias'}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <PageHeader
        title={editing ? 'Editar barbería' : 'Nueva barbería'}
        subtitle={
          editing
            ? 'Actualiza la información pública y operativa del tenant.'
            : 'Crea el tenant antes de invitar a sus administradores y barberos.'
        }
        className="mb-0"
      />

      {error && (
        <div role="alert" className="rounded-xl border-2 border-red-900 bg-red-50 p-4 text-sm font-semibold text-red-900">
          {error}
          {editing && (
            <button
              type="button"
              onClick={() => void loadBarberia()}
              className="ml-2 underline underline-offset-2"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {(!editing || nombre) && (
        <Card padding="lg" className="border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-6">
            <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-slate-950">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">Información general</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Estos datos identifican a la barbería en la plataforma.
                </p>
              </div>
            </div>

            <Input
              label="Nombre"
              value={nombre}
              maxLength={120}
              autoComplete="organization"
              placeholder="Ej. Barber Basti"
              error={fieldErrors.nombre}
              onChange={(event) => {
                const nextName = event.target.value;
                setNombre(nextName);
                if (!slugEdited) setSlug(normalizeSlug(nextName));
                if (fieldErrors.nombre) {
                  setFieldErrors((current) => ({ ...current, nombre: undefined }));
                }
              }}
            />

            <Input
              label="Comuna"
              value={comuna}
              maxLength={120}
              autoComplete="address-level2"
              placeholder="Ej. Providencia"
              error={fieldErrors.comuna}
              onChange={(event) => {
                setComuna(event.target.value);
                if (fieldErrors.comuna) {
                  setFieldErrors((current) => ({ ...current, comuna: undefined }));
                }
              }}
            />

            <div className="space-y-2">
              <Input
                label="Slug público"
                value={slug}
                maxLength={120}
                spellCheck={false}
                autoCapitalize="none"
                placeholder="barber-basti"
                error={fieldErrors.slug}
                onChange={(event) => {
                  setSlug(normalizeSlug(event.target.value));
                  setSlugEdited(true);
                  if (fieldErrors.slug) {
                    setFieldErrors((current) => ({ ...current, slug: undefined }));
                  }
                }}
              />
              <p className="text-xs text-slate-500">
                La URL pública será{' '}
                {slug ? (
                  <a
                    href={buildPublicBookingUrl(slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-slate-800 hover:underline"
                  >
                    /b/{slug}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-mono">/b/slug</span>
                )}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Link
                to={barberiaId ? `/platform/barberias/${barberiaId}` : '/platform/barberias'}
                className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                Cancelar
              </Link>
              <Button type="submit" disabled={saving} className="bg-slate-950 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear barbería'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

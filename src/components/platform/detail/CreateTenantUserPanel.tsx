import { Loader2, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '../../ui';
import { buildPublicBookingUrl, normalizeSlug, validateSlug } from '../../../lib/slug';
import {
  PlatformAdminError,
  platformAdmin,
  type PlatformUsuario,
  type TenantUserRole,
} from '../../../services/platformAdmin';

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

interface CreateTenantUserPanelProps {
  barberiaId: string;
  barberiaName: string;
  barberiaSlug: string;
  initialRole: TenantUserRole;
  onCreated: (user: PlatformUsuario) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

function initialForm(role: TenantUserRole): CreateUserForm {
  return {
    nombre: '',
    email: '',
    rol: role,
    slug: '',
    password: '',
    passwordConfirmation: '',
  };
}

function errorMessage(error: unknown): string {
  return error instanceof PlatformAdminError || error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.';
}

export default function CreateTenantUserPanel({
  barberiaId,
  barberiaName,
  barberiaSlug,
  initialRole,
  onCreated,
  onClose,
  onError,
}: CreateTenantUserPanelProps) {
  const [form, setForm] = useState<CreateUserForm>(() => initialForm(initialRole));
  const [errors, setErrors] = useState<CreateUserErrors>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validate = (): boolean => {
    const nextErrors: CreateUserErrors = {};
    if (!form.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    if (form.nombre.trim().length > 120) {
      nextErrors.nombre = 'Usa un máximo de 120 caracteres.';
    }
    if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }
    if (form.rol === 'barbero') {
      const slugError = validateSlug(form.slug);
      if (slugError) nextErrors.slug = slugError;
    }
    if (form.password.length < minimumPasswordLength) {
      nextErrors.password = `La contraseña debe tener al menos ${minimumPasswordLength} caracteres.`;
    }
    if (!form.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'Confirma la contraseña.';
    } else if (form.password !== form.passwordConfirmation) {
      nextErrors.passwordConfirmation = 'Las contraseñas no coinciden.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createUser = async () => {
    if (inFlightRef.current || !validate()) return;

    inFlightRef.current = true;
    setCreating(true);
    try {
      const result = await platformAdmin.createTenantUser({
        barberia_id: barberiaId,
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        rol: form.rol,
        password: form.password,
        ...(form.rol === 'barbero' && slugEdited ? { slug: form.slug } : {}),
      });
      if (mountedRef.current) onCreated(result.usuario);
    } catch (createError) {
      if (!mountedRef.current) return;
      if (createError instanceof PlatformAdminError) {
        if (createError.code === 'duplicate_barber_slug') {
          setErrors((current) => ({ ...current, slug: createError.message }));
        }
        if (createError.code === 'duplicate_email') {
          setErrors((current) => ({ ...current, email: createError.message }));
        }
        if (createError.code === 'password_too_short' || createError.code === 'password_policy') {
          setErrors((current) => ({ ...current, password: createError.message }));
        }
      }
      onError(errorMessage(createError));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setCreating(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createUser();
  };

  return (
    <Card
      id="create-tenant-user"
      padding="lg"
      className="detail-create-user-panel"
      aria-busy={creating}
    >
      <div className="detail-create-user-panel__heading">
        <div>
          <span>Credenciales directas</span>
          <h3 id="create-tenant-user-title">Crear usuario</h3>
          <p>Crea su acceso para {barberiaName} y define la contraseña inicial.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar formulario"
          disabled={creating}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="detail-create-user-form"
        aria-labelledby="create-tenant-user-title"
      >
        <div className="detail-form-grid">
          <Input
            label="Nombre"
            value={form.nombre}
            maxLength={120}
            autoComplete="name"
            placeholder="Nombre completo"
            error={errors.nombre}
            autoFocus
            disabled={creating}
            onChange={(event) => {
              const nextName = event.target.value;
              setForm((current) => ({
                ...current,
                nombre: nextName,
                slug:
                  current.rol === 'barbero' && !slugEdited
                    ? normalizeSlug(nextName)
                    : current.slug,
              }));
              if (errors.nombre) setErrors((current) => ({ ...current, nombre: undefined }));
            }}
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            maxLength={254}
            autoComplete="email"
            placeholder="persona@ejemplo.cl"
            error={errors.email}
            disabled={creating}
            onChange={(event) => {
              setForm((current) => ({ ...current, email: event.target.value }));
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
          />
        </div>

        <div className="detail-form-grid">
          <div className="detail-select-field">
            <label htmlFor="tenant-role">Rol</label>
            <select
              id="tenant-role"
              value={form.rol}
              disabled={creating}
              onChange={(event) => {
                const rol = event.target.value as TenantUserRole;
                setForm((current) => ({
                  ...current,
                  rol,
                  slug: rol === 'barbero' ? normalizeSlug(current.nombre) : '',
                }));
                setSlugEdited(false);
                setErrors((current) => ({ ...current, slug: undefined }));
              }}
            >
              <option value="barbero">Barbero</option>
              <option value="admin">Administrador</option>
            </select>
            <p>No es posible crear superadministradores desde esta interfaz.</p>
          </div>

          {form.rol === 'barbero' && (
            <Input
              label="Slug del barbero"
              value={form.slug}
              maxLength={120}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="nombre-barbero"
              error={errors.slug}
              disabled={creating}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  slug: normalizeSlug(event.target.value),
                }));
                setSlugEdited(true);
                if (errors.slug) setErrors((current) => ({ ...current, slug: undefined }));
              }}
            />
          )}
        </div>

        {form.rol === 'barbero' && form.slug && (
          <p className="detail-form-preview">
            <span>Enlace individual</span>
            <code>{buildPublicBookingUrl(barberiaSlug, form.slug)}</code>
          </p>
        )}

        <div className="detail-form-grid">
          <div>
            <Input
              id="initial-password"
              label="Contraseña inicial"
              type="password"
              value={form.password}
              minLength={minimumPasswordLength}
              autoComplete="new-password"
              required
              aria-describedby="initial-password-requirements"
              error={errors.password}
              disabled={creating}
              onChange={(event) => {
                setForm((current) => ({ ...current, password: event.target.value }));
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
              }}
            />
            <p id="initial-password-requirements" className="detail-form-help">
              Usa al menos {minimumPasswordLength} caracteres y entrégala por un canal seguro.
            </p>
          </div>
          <Input
            id="initial-password-confirmation"
            label="Confirmar contraseña"
            type="password"
            value={form.passwordConfirmation}
            minLength={minimumPasswordLength}
            autoComplete="new-password"
            required
            error={errors.passwordConfirmation}
            disabled={creating}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                passwordConfirmation: event.target.value,
              }));
              if (errors.passwordConfirmation) {
                setErrors((current) => ({ ...current, passwordConfirmation: undefined }));
              }
            }}
          />
        </div>

        <div className="detail-form-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button type="submit" disabled={creating} className="detail-submit-button">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? 'Creando usuario…' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

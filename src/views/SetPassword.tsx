import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageTransition } from '../components/layout/PageTransition';
import {
  consumeInitialInviteCallbackUrl,
  supabase,
} from '../config/supabaseClient';
import {
  AuthAccessError,
  clearValidatedSession,
  getMyProfile,
  type UserRole,
} from '../services/login';

const MIN_PASSWORD_LENGTH = 8;
const INVALID_INVITE_MESSAGE =
  'Esta invitación no es válida o ha expirado. Solicita una nueva invitación al administrador de tu barbería.';
const VALIDATION_ERROR_MESSAGE =
  'No pudimos validar la invitación en este momento. Revisa tu conexión e inténtalo nuevamente.';
const PROFILE_ERROR_NOTICE =
  'Tu contraseña fue creada, pero no pudimos cargar tu perfil. Inicia sesión nuevamente.';
const PENDING_INVITE_USER_KEY = 'barbersaas_pending_invite_user';

type InviteStatus = 'validating' | 'ready' | 'invalid' | 'validation-error' | 'success';

interface InviteCallback {
  accessToken: string | null;
  code: string | null;
  hasProviderError: boolean;
  isInvite: boolean;
  refreshToken: string | null;
}

function destinationForRole(role: UserRole): string {
  return role === 'superadmin' ? '/platform/barberias' : '/dashboard';
}

function parseInviteCallback(value: string): InviteCallback {
  const url = new URL(value);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const type = hash.get('type') ?? url.searchParams.get('type');
  const code = url.searchParams.get('code');

  return {
    accessToken: hash.get('access_token'),
    code,
    hasProviderError: Boolean(
      hash.get('error')
        || hash.get('error_code')
        || url.searchParams.get('error')
        || url.searchParams.get('error_code'),
    ),
    isInvite: type === 'invite' || (Boolean(code) && type === null),
    refreshToken: hash.get('refresh_token'),
  };
}

function cleanCallbackUrl(): void {
  window.history.replaceState(window.history.state, document.title, window.location.pathname);
}

function getPendingInviteUserId(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_INVITE_USER_KEY);
  } catch {
    return null;
  }
}

function setPendingInviteUserId(userId: string): void {
  try {
    window.sessionStorage.setItem(PENDING_INVITE_USER_KEY, userId);
  } catch {
    // The authenticated session remains the source of truth if storage is unavailable.
  }
}

function clearPendingInviteUserId(): void {
  try {
    window.sessionStorage.removeItem(PENDING_INVITE_USER_KEY);
  } catch {
    // Nothing sensitive is stored and there is no fallback cleanup to perform.
  }
}

function accessMessage(error: unknown): string {
  if (
    error instanceof AuthAccessError
    && (error.code === 'user_inactive' || error.code === 'barbershop_inactive')
  ) {
    return 'Tu cuenta o la barbería asociada no está activa. Contacta al administrador de la plataforma.';
  }

  return error instanceof AuthAccessError && error.code === 'profile_unavailable'
    ? VALIDATION_ERROR_MESSAGE
    : INVALID_INVITE_MESSAGE;
}

export function SetPassword() {
  const [status, setStatus] = useState<InviteStatus>('validating');
  const [inviteUserId, setInviteUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState(INVALID_INVITE_MESSAGE);
  const initialized = useRef(false);
  const mounted = useRef(false);
  const submissionInFlight = useRef(false);
  const redirectTimer = useRef<number | null>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Activa tu cuenta | BarberSaaS';
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const validateInvitation = async () => {
      const callbackUrl = consumeInitialInviteCallbackUrl() ?? window.location.href;
      const callback = parseInviteCallback(callbackUrl);
      const hasCallback = Boolean(
        callback.accessToken
          || callback.refreshToken
          || callback.code
          || callback.hasProviderError,
      );
      const pendingInviteUserId = getPendingInviteUserId();

      if (hasCallback && (!callback.isInvite || callback.hasProviderError)) {
        clearPendingInviteUserId();
        cleanCallbackUrl();
        if (mounted.current) setStatus('invalid');
        return;
      }

      if (!hasCallback && !pendingInviteUserId) {
        if (mounted.current) setStatus('invalid');
        return;
      }

      try {
        let callbackSession: Session | null = null;

        if (callback.code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            callback.code,
          );
          if (exchangeError || !data.session) throw exchangeError ?? new Error('missing session');
          callbackSession = data.session;
        } else if (callback.accessToken && callback.refreshToken) {
          const { data: currentSession } = await supabase.auth.getSession();

          if (currentSession.session?.access_token === callback.accessToken) {
            callbackSession = currentSession.session;
          } else {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: callback.accessToken,
              refresh_token: callback.refreshToken,
            });
            if (sessionError || !data.session) throw sessionError ?? new Error('missing session');
            callbackSession = data.session;
          }
        } else if (pendingInviteUserId) {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (
            sessionError
            || !data.session
            || data.session.user.id !== pendingInviteUserId
          ) {
            throw sessionError ?? new Error('pending invite session unavailable');
          }
          callbackSession = data.session;
        }

        if (!callbackSession?.user) throw new Error('missing invited user');

        setPendingInviteUserId(callbackSession.user.id);
        cleanCallbackUrl();
        await getMyProfile(callbackSession.user);

        if (mounted.current) {
          setInviteUserId(callbackSession.user.id);
          setStatus('ready');
        }
      } catch (validationError) {
        cleanCallbackUrl();
        console.error(
          'No se pudo validar la sesión de invitación:',
          validationError instanceof Error ? validationError.message : 'error desconocido',
        );

        const message = accessMessage(validationError);
        if (validationError instanceof AuthAccessError) {
          if (validationError.code !== 'profile_unavailable') {
            clearPendingInviteUserId();
            try {
              await signOut();
            } catch {
              console.error('No se pudo cerrar la sesión de invitación rechazada.');
            }
          }
        } else {
          clearPendingInviteUserId();
        }

        if (mounted.current) {
          setPageMessage(message);
          setStatus(message === VALIDATION_ERROR_MESSAGE ? 'validation-error' : 'invalid');
        }
      }
    };

    void validateInvitation();
  }, [signOut]);

  useEffect(
    () => () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlight.current || status !== 'ready') return;
    submissionInFlight.current = true;
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      submissionInFlight.current = false;
      return;
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      submissionInFlight.current = false;
      return;
    }

    try {
      setSubmitting(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user || userData.user.id !== inviteUserId) {
        clearPendingInviteUserId();
        setPageMessage(INVALID_INVITE_MESSAGE);
        setStatus('invalid');
        return;
      }

      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError || !data.user) throw updateError ?? new Error('missing updated user');

      let profile;
      try {
        profile = await getMyProfile(data.user);
      } catch (profileError) {
        console.error(
          'La cuenta fue activada, pero no se pudo resolver el perfil:',
          profileError instanceof Error ? profileError.message : 'error desconocido',
        );
        clearValidatedSession();
        clearPendingInviteUserId();
        try {
          await signOut();
        } catch {
          console.error('No se pudo cerrar la sesión sin perfil.');
        }
        navigate('/login', { replace: true, state: { notice: PROFILE_ERROR_NOTICE } });
        return;
      }

      clearPendingInviteUserId();
      setStatus('success');
      redirectTimer.current = window.setTimeout(() => {
        navigate(destinationForRole(profile.rol), { replace: true });
      }, 900);
    } catch (updateError) {
      console.error(
        'No se pudo establecer la contraseña de la invitación:',
        updateError instanceof Error ? updateError.message : 'error desconocido',
      );
      setError('No se pudo activar la cuenta. Verifica tu conexión o solicita una nueva invitación.');
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  const isLoading = status === 'validating';
  const isFailure = status === 'invalid' || status === 'validation-error';

  return (
    <PageTransition className="flex min-h-screen items-center justify-center bg-[#f4f4f6] p-4">
      <main className="w-full max-w-md space-y-6 rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 p-3 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {status === 'success' ? (
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
            ) : (
              <KeyRound className="h-6 w-6" strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Activa tu cuenta</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Crea una contraseña para comenzar a utilizar BarberSaaS.
          </p>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-6 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Validando invitación...
          </div>
        )}

        {isFailure && (
          <div className="space-y-4 text-center">
            <div role="alert" className="rounded-lg border-2 border-red-900 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
              {pageMessage}
            </div>
            {status === 'validation-error' && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="block w-full font-bold text-slate-900 underline underline-offset-4"
              >
                Intentar nuevamente
              </button>
            )}
            <Link to="/login" className="inline-flex font-bold text-slate-900 underline underline-offset-4">
              Volver al inicio de sesión
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div role="status" aria-live="polite" className="rounded-lg border-2 border-emerald-900 bg-emerald-50 px-3 py-3 text-center text-sm font-semibold text-emerald-700">
            Tu cuenta fue activada correctamente.
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-900">
                Contraseña
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-describedby="password-requirements"
                aria-invalid={Boolean(error)}
                required
                autoFocus
                disabled={submitting}
                className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
              />
              <p id="password-requirements" className="mt-1 text-xs font-medium text-slate-500">
                Usa al menos {MIN_PASSWORD_LENGTH} caracteres.
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-900">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-invalid={Boolean(error)}
                required
                disabled={submitting}
                className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border-2 border-red-900 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 py-3.5 font-black uppercase tracking-wider text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-amber-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
              {submitting ? 'Activando cuenta...' : 'Activar cuenta'}
            </button>
          </form>
        )}
      </main>
    </PageTransition>
  );
}

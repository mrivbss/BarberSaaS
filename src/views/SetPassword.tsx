import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, Scissors } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../config/supabaseClient';
import type { UserRole } from '../services/login';
import { PageTransition } from '../components/layout/PageTransition';

function destinationForRole(role: UserRole): string {
  return role === 'superadmin' ? '/platform/barberias' : '/dashboard';
}

export function SetPassword() {
  const { loading: authLoading, session, profile, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Crear contraseña | BarberSaaS';
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!session) {
      setError('El enlace de invitación no es válido o ya expiró.');
      return;
    }

    try {
      setSubmitting(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const refreshedProfile = profile ?? (await refreshProfile());
      setSuccess(true);

      if (refreshedProfile) {
        navigate(destinationForRole(refreshedProfile.rol), { replace: true });
      }
    } catch (updateError) {
      console.error('No se pudo establecer la contraseña:', updateError);
      setError('No se pudo guardar la contraseña. Solicita una nueva invitación e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f6]">
        <Loader2 className="h-7 w-7 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <PageTransition className="flex min-h-screen items-center justify-center bg-[#f4f4f6] p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 p-3 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            {session ? <KeyRound className="h-6 w-6" strokeWidth={2.5} /> : <Scissors className="h-6 w-6" strokeWidth={2.5} />}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Crear contraseña</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Completa la activación de tu cuenta de BarberSaaS.
          </p>
        </div>

        {!session ? (
          <div className="space-y-4 text-center">
            <div role="alert" className="rounded-lg border-2 border-red-900 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
              El enlace de invitación no es válido o ya expiró.
            </div>
            <Link to="/login" className="inline-flex font-bold text-slate-900 underline underline-offset-4">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-900">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
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
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border-2 border-red-900 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div role="status" className="rounded-lg border-2 border-emerald-900 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Contraseña creada correctamente.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 py-3.5 font-black uppercase tracking-wider text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-amber-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </PageTransition>
  );
}

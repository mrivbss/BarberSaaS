import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Scissors } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../services/login';
import { PageTransition } from '../components/layout/PageTransition';

function destinationForRole(role: UserRole): string {
  return role === 'superadmin' ? '/platform/barberias' : '/dashboard';
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'No se pudo iniciar sesión. Inténtalo nuevamente.';
}

interface LoginNavigationState {
  notice?: string;
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as LoginNavigationState | null;
  const notice = typeof navigationState?.notice === 'string' ? navigationState.notice : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Completa todos los campos.');
      return;
    }

    try {
      setSubmitting(true);
      const profile = await signIn(email, password);
      navigate(destinationForRole(profile.rol), { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition className="flex min-h-screen items-center justify-center bg-[#f4f4f6] p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-400 p-3 font-black text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Scissors className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Iniciar Sesión</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ingresa a tu panel de BarberSaaS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {notice && (
            <div role="status" className="rounded-lg border-2 border-slate-900 bg-amber-50 px-3 py-2 text-sm font-semibold text-slate-800">
              {notice}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-900">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@ejemplo.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-900">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {formError && (
            <div role="alert" className="rounded-lg border-2 border-red-900 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-amber-400 py-3.5 font-black uppercase tracking-wider text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all hover:bg-amber-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </PageTransition>
  );
}

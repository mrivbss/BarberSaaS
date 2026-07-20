import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabaseClient';
import {
  AuthAccessError,
  cacheValidatedSession,
  clearValidatedSession,
  getMyProfile,
  loginUser,
  logoutUser,
  type UserSession,
} from '../services/login';

interface AuthContextValue {
  session: Session | null;
  profile: UserSession | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<UserSession>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'No se pudo validar la sesión.';
}

function shouldEndSession(error: unknown): boolean {
  return (
    error instanceof AuthAccessError &&
    (error.code === 'invalid_profile' ||
      error.code === 'user_inactive' ||
      error.code === 'barbershop_inactive')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const validationSequence = useRef(0);

  const validateSession = useCallback(async (nextSession: Session | null) => {
    const sequence = ++validationSequence.current;
    setSession(nextSession);

    if (!nextSession?.user) {
      clearValidatedSession();
      setProfile(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const validatedProfile = await getMyProfile(nextSession.user);
      if (sequence !== validationSequence.current) return null;

      setProfile(validatedProfile);
      return validatedProfile;
    } catch (validationError) {
      if (sequence !== validationSequence.current) return null;

      clearValidatedSession();
      setProfile(null);
      setError(messageFromError(validationError));

      if (shouldEndSession(validationError)) {
        setSession(null);
        await supabase.auth.signOut();
      }

      return null;
    } finally {
      if (sequence === validationSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        clearValidatedSession();
        setSession(null);
        setProfile(null);
        setError('No se pudo recuperar la sesión. Inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      await validateSession(data.session);
    };

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase recommends keeping this callback synchronous. Validation runs
      // after the auth callback finishes to avoid locking another Auth request.
      window.setTimeout(() => {
        if (active) void validateSession(nextSession);
      }, 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [validateSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await loginUser(email, password);
    validationSequence.current += 1;
    setSession(result.session);
    setProfile(result.profile);
    cacheValidatedSession(result.profile);
    setLoading(false);
    return result.profile;
  }, []);

  const signOut = useCallback(async () => {
    validationSequence.current += 1;
    clearValidatedSession();
    setSession(null);
    setProfile(null);
    setError(null);
    setLoading(false);
    await logoutUser();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return null;

    try {
      const refreshedProfile = await getMyProfile(session.user);
      setProfile(refreshedProfile);
      setError(null);
      return refreshedProfile;
    } catch (refreshError) {
      clearValidatedSession();
      setProfile(null);
      setError(messageFromError(refreshError));
      if (shouldEndSession(refreshError)) {
        setSession(null);
        await supabase.auth.signOut();
      }
      return null;
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading, error, signIn, signOut, refreshProfile }),
    [session, profile, loading, error, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  return context;
}

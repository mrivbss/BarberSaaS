/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const inviteCallbackPaths = new Set([
  '/auth/accept-invite',
  '/establecer-contrasena',
  '/set-password',
]);

let initialInviteCallbackUrl =
  typeof window !== 'undefined' && inviteCallbackPaths.has(window.location.pathname)
    ? window.location.href
    : null;

/**
 * Supabase may consume an implicit callback while the application modules load.
 * Preserve it once, in memory only, so the public invitation route can verify
 * that its session came from an actual invite rather than an existing login.
 */
export function consumeInitialInviteCallbackUrl(): string | null {
  const callbackUrl = initialInviteCallbackUrl;
  initialInviteCallbackUrl = null;
  return callbackUrl;
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en la configuración del frontend.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

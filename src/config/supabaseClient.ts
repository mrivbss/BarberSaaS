import { createClient } from '@supabase/supabase-js';

// Datos reales extraídos de la consola en image_e8c03d.png
const supabaseUrl = 'https://qjttvjyvevaarmwvxevt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdHR2anl2ZXZhYXJtd3Z4ZXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTQ3OTUsImV4cCI6MjA5ODg3MDc5NX0.8-yUq3Nrk4DYIG9FhWf58WyEyUvvNSdUQGCWt_XW3YM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.usuarios TO authenticated;
GRANT SELECT ON public.usuarios TO anon;
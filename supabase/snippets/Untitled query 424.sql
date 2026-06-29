-- 1. Asegurar que los roles de tu app (anon, authenticated) tengan permiso de usar las tablas
GRANT ALL ON TABLE public.barberias TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.citas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ganancias TO anon, authenticated, service_role;

-- 2. Crear una "Barbería Principal" de prueba (si la tabla está vacía)
INSERT INTO public.barberias (nombre, comuna) 
SELECT 'Barbería Principal', 'Santiago Centro'
WHERE NOT EXISTS (SELECT 1 FROM public.barberias);

-- 3. Migrar automáticamente todos los usuarios que hayas creado en Auth hacia tu tabla pública
-- Asignándoles el rol de 'admin' y amarrándolos a la barbería recién creada.
INSERT INTO public.usuarios (id, email, rol, barberia_id)
SELECT 
    au.id, 
    au.email, 
    'admin', 
    (SELECT id FROM public.barberias LIMIT 1) 
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.usuarios pu WHERE pu.id = au.id
);

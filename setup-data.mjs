import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para ejecutar este script.');
}

const localSupabase = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);
const remoteProjectRef = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1];
if (
  !localSupabase
  && (
    process.env.ALLOW_REMOTE_SEED !== 'true'
    || !remoteProjectRef
    || process.env.CONFIRM_PROJECT_REF !== remoteProjectRef
  )
) {
  throw new Error(
    'Para un seed remoto define ALLOW_REMOTE_SEED=true y CONFIRM_PROJECT_REF con el project ref exacto.',
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const seedRole = process.env.SEED_DEFAULT_ROLE ?? 'barbero';
if (seedRole !== 'admin' && seedRole !== 'barbero') {
  throw new Error('SEED_DEFAULT_ROLE sólo puede ser admin o barbero.');
}

function normalizeSlug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function setup() {
  console.log('--- Iniciando configuración de datos básicos ---');

  // 1. Crear una barbería si no existe
  let barberiaId;
  const { data: barberias, error: bError } = await supabase
    .from('barberias')
    .select('id,nombre,slug')
    .limit(1);
  
  if (bError) {
    console.error('Error al leer barberias:', bError.message);
    return;
  }

  if (barberias.length === 0) {
    console.log('No hay barberías. Creando "Barbería Principal"...');
    const { data: newBarberia, error: createBError } = await supabase
      .from('barberias')
      .insert([{
        nombre: 'Barbería Principal',
        comuna: 'Santiago Centro',
        slug: process.env.SEED_BARBERIA_SLUG ?? 'barberia-principal',
      }])
      .select('id,nombre,slug')
      .single();
      
    if (createBError) {
      console.error('Error al crear barbería:', createBError.message);
      return;
    }
    barberiaId = newBarberia.id;
    console.log('✅ Barbería creada con ID:', barberiaId);
  } else {
    barberiaId = barberias[0].id;
    console.log('✅ Usando barbería existente:', barberias[0].nombre, 'con ID:', barberiaId);
  }

  // 2. Obtener usuarios de Auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error al listar usuarios de Auth:', authError.message);
    return;
  }

  const authUsers = authData.users;
  console.log(`Se encontraron ${authUsers.length} usuarios en Supabase Auth.`);

  // 3. Obtener usuarios de la tabla pública
  const { data: publicUsers, error: pError } = await supabase
    .from('usuarios')
    .select('id,slug,barberia_id');
  if (pError) {
    console.error('Error al leer usuarios públicos:', pError.message);
    return;
  }
  
  const publicUserIds = new Set(publicUsers.map((user) => user.id));
  const occupiedSlugs = new Set(
    publicUsers
      .filter((user) => user.barberia_id === barberiaId && user.slug)
      .map((user) => user.slug),
  );

  // 4. Sincronizar (Insertar los que faltan en public.usuarios)
  for (const user of authUsers) {
    if (!publicUserIds.has(user.id)) {
      const email = user.email?.trim().toLowerCase();
      if (!email) {
        console.warn('Se omitió una cuenta Auth sin correo.');
        continue;
      }

      const nombre = String(user.user_metadata?.nombre || email.split('@')[0]).trim();
      const baseSlug = normalizeSlug(nombre) || 'barbero';
      let slug = baseSlug;
      let suffix = 2;
      while (occupiedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      console.log('Enlazando una cuenta Auth que no tiene perfil público...');
      const { error: insertError } = await supabase.from('usuarios').insert([{
        id: user.id,
        nombre,
        email,
        rol: seedRole,
        barberia_id: barberiaId,
        slug: seedRole === 'barbero' ? slug : null,
        activo: true,
      }]);
      
      if (insertError) {
        console.error('Error al insertar el perfil:', insertError.message);
      } else {
        if (seedRole === 'barbero') occupiedSlugs.add(slug);
        console.log('✅ Perfil enlazado correctamente a la barbería.');
      }
    } else {
      console.log('✅ La cuenta Auth ya tiene un perfil configurado.');
    }
  }
  
  console.log('--- Proceso finalizado ---');
}

setup().catch((error) => {
  console.error('El setup falló:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

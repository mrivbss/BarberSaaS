import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
// Usando el service_role secret key para poder acceder a la API de Auth Admin y saltarse RLS si existiera
const supabaseSecretKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; 

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function setup() {
  console.log('--- Iniciando configuración de datos básicos ---');

  // 1. Crear una barbería si no existe
  let barberiaId;
  const { data: barberias, error: bError } = await supabase.from('barberias').select('*');
  
  if (bError) {
    console.error('Error al leer barberias:', bError.message);
    return;
  }

  if (barberias.length === 0) {
    console.log('No hay barberías. Creando "Barbería Principal"...');
    const { data: newBarberia, error: createBError } = await supabase
      .from('barberias')
      .insert([{ nombre: 'Barbería Principal', comuna: 'Santiago Centro' }])
      .select()
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
  const { data: publicUsers, error: pError } = await supabase.from('usuarios').select('id');
  if (pError) {
    console.error('Error al leer usuarios públicos:', pError.message);
    return;
  }
  
  const publicUserIds = publicUsers.map(u => u.id);

  // 4. Sincronizar (Insertar los que faltan en public.usuarios)
  for (const user of authUsers) {
    if (!publicUserIds.includes(user.id)) {
      console.log(`El usuario ${user.email} (ID: ${user.id}) no está en la tabla usuarios. Insertando...`);
      const { error: insertError } = await supabase.from('usuarios').insert([{
        id: user.id,
        email: user.email,
        rol: 'admin', // Por defecto los hacemos admin para que puedan probar todo
        barberia_id: barberiaId
      }]);
      
      if (insertError) {
        console.error(`Error al insertar usuario ${user.email}:`, insertError.message);
      } else {
        console.log(`✅ Usuario ${user.email} enlazado correctamente a la barbería.`);
      }
    } else {
      console.log(`✅ El usuario ${user.email} ya está configurado correctamente en la base de datos.`);
    }
  }
  
  console.log('--- Proceso finalizado ---');
}

setup();

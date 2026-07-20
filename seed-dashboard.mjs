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

async function seed() {
  console.log('--- Iniciando Seed de Dashboard ---');
  
  // 1. Obtener la primera barbería y el primer usuario (admin)
  const { data: barberias, error: barberiasError } = await supabase
    .from('barberias')
    .select('id')
    .eq('activo', true)
    .limit(1);
  if (barberiasError) throw barberiasError;
  if (!barberias || barberias.length === 0) {
    console.error('No hay barberías creadas. Corre setup-data.mjs primero.');
    return;
  }
  const barberiaId = barberias[0].id;

  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('barberia_id', barberiaId)
    .eq('activo', true)
    .eq('rol', 'barbero')
    .limit(1);
  if (usuariosError) throw usuariosError;
  if (!usuarios || usuarios.length === 0) {
    console.error('No hay un barbero activo en esta barbería.');
    process.exitCode = 1;
    return;
  }
  const barberoId = usuarios[0].id;

  const hoy = new Date().toISOString().split('T')[0];

  console.log(`Usando Barbería ID: ${barberiaId} y Barbero ID: ${barberoId}`);

  // 2. Insertar citas para hoy
  const citas = [
    { cliente: 'Juan Pérez Demo', fecha: hoy, hora: '14:30:00', barbero_id: barberoId, barberia_id: barberiaId },
    { cliente: 'Carlos Gómez Demo', fecha: hoy, hora: '15:00:00', barbero_id: barberoId, barberia_id: barberiaId },
    { cliente: 'Matías Silva Demo', fecha: hoy, hora: '16:15:00', barbero_id: barberoId, barberia_id: barberiaId }
  ];

  const { error: errCitas } = await supabase.from('citas').insert(citas);
  if (errCitas) console.error('Error insertando citas:', errCitas.message);
  else console.log('✅ Citas insertadas con éxito.');

  // 3. Insertar ganancias para hoy
  const ganancias = [
    { monto: 15000, concepto: 'Corte Fade', barbero_id: barberoId, barberia_id: barberiaId },
    { monto: 10000, concepto: 'Perfilado de Barba', barbero_id: barberoId, barberia_id: barberiaId },
    { monto: 20000, concepto: 'Corte + Barba', barbero_id: barberoId, barberia_id: barberiaId }
  ];

  const { error: errGanancias } = await supabase.from('ganancias').insert(ganancias);
  if (errGanancias) console.error('Error insertando ganancias:', errGanancias.message);
  else console.log('✅ Ganancias insertadas con éxito.');

  console.log('--- Fin del Seed ---');
}

seed().catch((error) => {
  console.error('El seed falló:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

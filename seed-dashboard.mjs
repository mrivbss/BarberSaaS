import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseSecretKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; 
const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function seed() {
  console.log('--- Iniciando Seed de Dashboard ---');
  
  // 1. Obtener la primera barbería y el primer usuario (admin)
  const { data: barberias } = await supabase.from('barberias').select('id').limit(1);
  if (!barberias || barberias.length === 0) {
    console.error('No hay barberías creadas. Corre setup-data.mjs primero.');
    return;
  }
  const barberiaId = barberias[0].id;

  const { data: usuarios } = await supabase.from('usuarios').select('id').eq('barberia_id', barberiaId).limit(1);
  if (!usuarios || usuarios.length === 0) {
    console.error('No hay usuarios en esta barbería.');
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

seed();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Define SUPABASE_URL y SUPABASE_ANON_KEY para ejecutar este script.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  let failed = false;

  for (const table of ['barberias', 'usuarios', 'citas', 'ganancias']) {
    const { error } = await supabase.from(table).select('id', { head: true });
    if (!error) {
      console.error(`❌ Seguridad inválida: anon pudo consultar public.${table}.`);
      failed = true;
    } else {
      console.log(`✅ public.${table} rechaza consultas directas de anon.`);
    }
  }

  const { data, error: rpcError } = await supabase.rpc('obtener_portal_publico', {
    p_barberia_slug: 'security-check-does-not-exist',
    p_barbero_slug: null,
  });

  if (rpcError || data?.status !== 'barberia_no_encontrada') {
    console.error('❌ La RPC pública no respondió con el contrato esperado.');
    failed = true;
  } else {
    console.log('✅ La superficie RPC pública permanece disponible.');
  }

  if (failed) process.exitCode = 1;
}

check().catch((error) => {
  console.error('❌ Falló el smoke test de seguridad:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

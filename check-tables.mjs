import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // From supabase status output in prompt

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('barberias').select('*');
  if (error) {
    console.error('Error fetching barberias:', error.message);
  } else {
    console.log('Barberias:', data);
  }

  const { data: users, error: uError } = await supabase.from('usuarios').select('*');
  if (uError) {
    console.error('Error fetching usuarios:', uError.message);
  } else {
    console.log('Usuarios:', users);
  }
}

check();

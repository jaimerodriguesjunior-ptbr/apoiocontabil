import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTriggers() {
  // Querying pg_trigger to find triggers on auth.users
  // Note: We might not have access to auth schema via JS client, 
  // but we can try to find triggers in the public schema that might be causing this.
  
  console.log('Checking for triggers in public schema...');
  const { data: triggers, error } = await supabase
    .from('pg_trigger')
    .select('*')
    .catch(() => ({ data: null, error: 'Cannot access pg_trigger' }));

  if (error) {
    console.log('Error or no access to pg_trigger. Trying a different way...');
  }

  // Usually, these functions are in the public schema
  const { data: functions } = await supabase.rpc('get_functions').catch(() => ({ data: null }));
  if (functions) {
    console.log('Functions found:', functions);
  } else {
    console.log('No RPC get_functions found.');
  }
}

findTriggers();

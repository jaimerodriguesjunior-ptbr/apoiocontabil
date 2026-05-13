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

async function checkData() {
  console.log('--- ORGANIZATIONS ---');
  const { data: orgs } = await supabase.from('organizations').select('id, name');
  orgs.forEach(o => console.log(`Org: ${o.name} [ID: ${o.id}]`));

  console.log('\n--- PROFILES ---');
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, organization_id');
  profiles.forEach(p => {
    const org = orgs.find(o => o.id === p.organization_id);
    console.log(`User: ${p.full_name} | Role: ${p.role} | Org: ${org ? org.name : 'NONE'}`);
  });
}

checkData();

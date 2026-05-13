import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manual env loading for .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = process.argv[2];

if (!orgId) {
  console.error('Usage: node scripts/clear-org-data.mjs <organization_id>');
  process.exit(1);
}

async function clearData() {
  console.log(`Clearing transactional data for organization: ${orgId}`);

  const tables = [
    'fiscal_invoices',
    'expenses',
    'fixed_expense_entries',
    'catalog_items',
    'client_services',
    'clients'
  ];

  for (const table of tables) {
    console.log(`- Clearing ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('organization_id', orgId);
    
    if (error) {
      console.error(`  Error clearing ${table}:`, error.message);
    } else {
      console.log(`  Done.`);
    }
  }

  console.log('Finished clearing data.');
}

clearData();

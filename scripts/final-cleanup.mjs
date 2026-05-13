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

const REAL_ORG_ID = '7cc29313-73a0-42c6-b185-81dab278850b'; // SCHLOSSER TRANSPORTES
const GHOST_ORGS = [
  '18b795ae-ec3d-42e5-bc47-7bedf526dcdc', // teste
  'e6eafff2-e56a-4c50-8d55-3ea72472e176', // Evavan
  'da5aa05f-ff49-4c87-a489-58378f2ea49e'  // Loja
];

async function cleanup() {
  console.log('Iniciando limpeza de dados...');

  // 1. Desvincular o contador (teste) da empresa fantasma antes de deletá-la
  console.log('- Ajustando perfil do contador...');
  const { error: updError } = await supabase
    .from('profiles')
    .update({ organization_id: null })
    .eq('organization_id', '18b795ae-ec3d-42e5-bc47-7bedf526dcdc');
  
  if (updError) console.error('  Erro ao ajustar contador:', updError.message);

  // 2. Limpar dados transacionais da empresa real (SCHLOSSER)
  const tablesToClear = [
    'fiscal_invoices',
    'fixed_expense_entries',
    'expenses',
    'catalog_items',
    'client_services',
    'clients'
  ];

  for (const table of tablesToClear) {
    console.log(`- Limpando tabela ${table} (Empresa Real)...`);
    const { error } = await supabase.from(table).delete().eq('organization_id', REAL_ORG_ID);
    if (error) console.error(`  Erro em ${table}:`, error.message);
  }

  // 3. Deletar as empresas fantasma
  console.log('- Deletando empresas redundantes...');
  for (const orgId of GHOST_ORGS) {
    // Deletar settings primeiro
    await supabase.from('company_settings').delete().eq('organization_id', orgId);
    // Deletar a org
    const { error } = await supabase.from('organizations').delete().eq('id', orgId);
    if (error) console.log(`  Nota: Não foi possível deletar org ${orgId} (talvez ainda tenha dependências).`);
    else console.log(`  Org ${orgId} deletada.`);
  }

  console.log('Limpeza concluída!');
}

cleanup();

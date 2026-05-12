import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fjqxtjikhjuewpsfaygc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcXh0amlraGp1ZXdwc2ZheWdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwMzUyMSwiZXhwIjoyMDkzODc5NTIxfQ.O-tGaSTUQI9kwEAJgu4JWP_V4h9J_u11rCYgCTfhg24'
);

async function run() {
  const { data: templates } = await supabase.from('fixed_expense_templates').select('*').order('created_at', { ascending: true });
  
  const seen = new Set();
  const toDelete = [];
  
  for (const t of templates) {
    const key = t.organization_id + '-' + t.name;
    if (seen.has(key)) {
      toDelete.push(t.id);
    } else {
      seen.add(key);
    }
  }
  
  if (toDelete.length > 0) {
    console.log('Deleting', toDelete.length, 'duplicates...');
    const { error } = await supabase.from('fixed_expense_templates').delete().in('id', toDelete);
    if (error) console.error(error);
    else console.log('Deleted successfully.');
  } else {
    console.log('No duplicates found.');
  }
}
run();

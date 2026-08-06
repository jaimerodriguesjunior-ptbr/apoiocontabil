-- Base para emissao/importacao de NF-e (modelo 55).
-- Execute no SQL Editor do Supabase antes de liberar o modulo NFe.

alter table public.company_settings
  add column if not exists nfe_serie integer not null default 1;

alter table public.catalog_items
  add column if not exists codigo text,
  add column if not exists cfop text,
  add column if not exists unidade text not null default 'UN';

alter table public.fiscal_invoices
  add column if not exists direction text,
  add column if not exists natureza_operacao text,
  add column if not exists finalidade_nfe integer,
  add column if not exists referenced_invoice_id uuid references public.fiscal_invoices(id),
  add column if not exists referenced_key text,
  add column if not exists emitente_nome text,
  add column if not exists emitente_cnpj text,
  add column if not exists destinatario_nome text,
  add column if not exists destinatario_cnpj text,
  add column if not exists protocol text;

create table if not exists public.nfe_sequences (
  id bigserial primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  serie integer not null default 1,
  environment text not null default 'production' check (environment in ('production', 'homologation')),
  last_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, serie, environment)
);

create table if not exists public.nfe_import_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chave_acesso text,
  xml_content text not null,
  status text not null default 'pending' check (status in ('pending', 'imported', 'error', 'ignored')),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, chave_acesso)
);

alter table public.nfe_sequences enable row level security;
alter table public.nfe_import_queue enable row level security;

drop policy if exists "nfe_sequences_all" on public.nfe_sequences;
create policy "nfe_sequences_all" on public.nfe_sequences
  for all using (organization_id = public.get_user_org_id())
  with check (organization_id = public.get_user_org_id());

drop policy if exists "nfe_import_queue_all" on public.nfe_import_queue;
create policy "nfe_import_queue_all" on public.nfe_import_queue
  for all using (organization_id = public.get_user_org_id())
  with check (organization_id = public.get_user_org_id());

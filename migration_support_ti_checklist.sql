-- ============================================================
-- Suporte TI checklist por empresa (persistencia + RLS)
-- ============================================================
-- Execute apos as migracoes base (migration.sql + migration_mvp_foundation.sql)

create table if not exists company_support_ti_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  checklist jsonb not null default jsonb_build_object(
    'nfse', jsonb_build_object(
      'cadastro_prefeitura_homologacao', false,
      'solicitacao_rps_homologacao', false,
      'cadastro_nuvemfiscal_homologacao', false,
      'cadastro_lote_rps_nuvemfiscal_homologacao', false,
      'cadastro_nuvemfiscal_producao', false,
      'verificar_ultima_nota_com_contador', false,
      'cadastro_lote_rps_nuvemfiscal_producao', false
    ),
    'nfce', jsonb_build_object(
      'solicitar_upd_sefaz', false,
      'autorizar_upd_sefaz', false
    ),
    'nfe', jsonb_build_object(
      'solicitar_upd_sefaz', false,
      'autorizar_upd_sefaz', false
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_support_ti_checklists_org_unique unique (organization_id)
);

create index if not exists company_support_ti_checklists_org_idx
  on company_support_ti_checklists (organization_id);

alter table company_support_ti_checklists enable row level security;

drop policy if exists "support_ti_checklists_select" on company_support_ti_checklists;
create policy "support_ti_checklists_select"
  on company_support_ti_checklists
  for select
  using (can_access_org(organization_id));

drop policy if exists "support_ti_checklists_insert" on company_support_ti_checklists;
create policy "support_ti_checklists_insert"
  on company_support_ti_checklists
  for insert
  with check (can_access_org(organization_id));

drop policy if exists "support_ti_checklists_update" on company_support_ti_checklists;
create policy "support_ti_checklists_update"
  on company_support_ti_checklists
  for update
  using (can_access_org(organization_id))
  with check (can_access_org(organization_id));

drop policy if exists "support_ti_checklists_delete" on company_support_ti_checklists;
create policy "support_ti_checklists_delete"
  on company_support_ti_checklists
  for delete
  using (can_access_org(organization_id));

grant select, insert, update, delete on company_support_ti_checklists to authenticated;


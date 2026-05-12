-- ============================================================
-- Apoio Contabil - Fixed monthly expenses
-- Execute after migration_expenses.sql
-- ============================================================

create table if not exists fixed_expense_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  name text not null,
  active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists fixed_expense_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  template_id uuid references fixed_expense_templates(id) on delete cascade not null,
  reference_month text not null,
  amount numeric(10,2) not null,
  expense_id uuid references expenses(id),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (template_id, reference_month)
);

alter table fixed_expense_templates enable row level security;
alter table fixed_expense_entries enable row level security;

create index if not exists fixed_expense_templates_org_active_idx
  on fixed_expense_templates (organization_id, active, name);

create index if not exists fixed_expense_entries_org_month_idx
  on fixed_expense_entries (organization_id, reference_month);

drop policy if exists "fixed_expense_templates_select" on fixed_expense_templates;
create policy "fixed_expense_templates_select" on fixed_expense_templates
  for select using (
    organization_id = get_user_org_id()
    and is_user_active()
  );

drop policy if exists "fixed_expense_templates_insert" on fixed_expense_templates;
create policy "fixed_expense_templates_insert" on fixed_expense_templates
  for insert with check (
    organization_id = get_user_org_id()
    and get_user_role() = 'cliente_admin'
    and is_user_active()
  );

drop policy if exists "fixed_expense_templates_update" on fixed_expense_templates;
create policy "fixed_expense_templates_update" on fixed_expense_templates
  for update using (
    organization_id = get_user_org_id()
    and get_user_role() = 'cliente_admin'
    and is_user_active()
  );

drop policy if exists "fixed_expense_entries_select" on fixed_expense_entries;
create policy "fixed_expense_entries_select" on fixed_expense_entries
  for select using (
    organization_id = get_user_org_id()
    and is_user_active()
  );

drop policy if exists "fixed_expense_entries_insert" on fixed_expense_entries;
create policy "fixed_expense_entries_insert" on fixed_expense_entries
  for insert with check (
    organization_id = get_user_org_id()
    and get_user_role() in ('cliente_admin', 'cliente_usuario')
    and is_user_active()
  );

drop policy if exists "fixed_expense_entries_update" on fixed_expense_entries;
create policy "fixed_expense_entries_update" on fixed_expense_entries
  for update using (
    organization_id = get_user_org_id()
    and get_user_role() = 'cliente_admin'
    and is_user_active()
  );

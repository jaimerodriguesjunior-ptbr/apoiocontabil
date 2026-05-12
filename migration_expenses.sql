-- ============================================================
-- Apoio Contabil - Expenses
-- Execute after migration_catalog_items.sql
-- ============================================================

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  amount numeric(10,2) not null,
  spent_at text not null,
  note text,
  expense_date date default current_date,
  reference_month text not null,
  source text default 'manual',
  active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_source_check'
  ) then
    alter table expenses
      add constraint expenses_source_check
      check (source in ('manual', 'fixed'))
      not valid;
  end if;
end;
$$;

alter table expenses validate constraint expenses_source_check;

alter table expenses enable row level security;

create index if not exists expenses_org_month_idx
  on expenses (organization_id, reference_month, active);

create index if not exists expenses_org_date_idx
  on expenses (organization_id, expense_date desc);

drop policy if exists "expenses_select" on expenses;
create policy "expenses_select" on expenses
  for select using (
    organization_id = get_user_org_id()
    and is_user_active()
  );

drop policy if exists "expenses_insert" on expenses;
create policy "expenses_insert" on expenses
  for insert with check (
    organization_id = get_user_org_id()
    and get_user_role() in ('cliente_admin', 'cliente_usuario')
    and is_user_active()
  );

drop policy if exists "expenses_update" on expenses;
create policy "expenses_update" on expenses
  for update using (
    organization_id = get_user_org_id()
    and get_user_role() = 'cliente_admin'
    and is_user_active()
  );

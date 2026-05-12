-- ============================================================
-- Apoio Contabil - Catalog items per company
-- Execute after migration_mvp_foundation.sql
-- ============================================================

create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  name text not null,
  item_type text not null default 'servico',
  price numeric(10,2) default 0,
  ncm text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_items_item_type_check'
  ) then
    alter table catalog_items
      add constraint catalog_items_item_type_check
      check (item_type in ('produto', 'servico'))
      not valid;
  end if;
end;
$$;

alter table catalog_items validate constraint catalog_items_item_type_check;

alter table catalog_items enable row level security;

create index if not exists catalog_items_org_active_idx
  on catalog_items (organization_id, active, name);

drop policy if exists "catalog_items_select" on catalog_items;
create policy "catalog_items_select" on catalog_items
  for select using (
    organization_id = get_user_org_id()
    and is_user_active()
  );

drop policy if exists "catalog_items_insert" on catalog_items;
create policy "catalog_items_insert" on catalog_items
  for insert with check (
    organization_id = get_user_org_id()
    and get_user_role() in ('cliente_admin', 'cliente_usuario')
    and is_user_active()
  );

drop policy if exists "catalog_items_update" on catalog_items;
create policy "catalog_items_update" on catalog_items
  for update using (
    organization_id = get_user_org_id()
    and get_user_role() in ('cliente_admin', 'cliente_usuario')
    and is_user_active()
  );

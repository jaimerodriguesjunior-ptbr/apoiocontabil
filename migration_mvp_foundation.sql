-- ============================================================
-- Apoio Contabil - MVP foundation: roles, company status, modules
-- Execute after migration.sql and migration_batch_origin.sql
-- ============================================================

-- User roles:
-- contador: accounting office user
-- cliente_admin: company admin user
-- cliente_usuario: company operator user
alter table profiles
  add column if not exists role text default 'contador',
  add column if not exists is_active boolean default true,
  add column if not exists email text;

alter table profiles
  alter column role set default 'contador';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table profiles
      add constraint profiles_role_check
      check (role in ('contador', 'cliente_admin', 'cliente_usuario'))
      not valid;
  end if;
end;
$$;

alter table profiles validate constraint profiles_role_check;

-- Company/tenant metadata used by the accountant portfolio.
alter table organizations
  add column if not exists owner_accountant_id uuid references profiles(id),
  add column if not exists document text,
  add column if not exists module_access text default 'nfse',
  add column if not exists is_blocked boolean default false,
  add column if not exists blocked_reason text,
  add column if not exists blocked_at timestamptz,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_module_access_check'
  ) then
    alter table organizations
      add constraint organizations_module_access_check
      check (module_access in ('nfse', 'nfce', 'nfse_nfce'))
      not valid;
  end if;
end;
$$;

alter table organizations validate constraint organizations_module_access_check;

create index if not exists organizations_owner_accountant_idx
  on organizations (owner_accountant_id, name);

create index if not exists profiles_organization_role_idx
  on profiles (organization_id, role, is_active);

create index if not exists profiles_email_idx
  on profiles (email);

-- In the MVP, public sign-up creates accountant users. Company users are
-- created later by the accountant with an explicit client role.
update profiles
set role = coalesce(role, 'contador'),
    is_active = coalesce(is_active, true)
where role is null or is_active is null;

update organizations
set module_access = coalesce(module_access, 'nfse'),
    is_blocked = coalesce(is_blocked, false),
    updated_at = coalesce(updated_at, now())
where module_access is null or is_blocked is null or updated_at is null;

-- Helpers used by RLS and server actions.
create or replace function get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_user_active()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(is_active, false) from profiles where id = auth.uid()
$$;

create or replace function can_access_org(target_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from profiles p
    left join organizations o on o.id = target_org_id
    where p.id = auth.uid()
      and coalesce(p.is_active, false) = true
      and (
        p.organization_id = target_org_id
        or (p.role = 'contador' and o.owner_accountant_id = p.id)
      )
      and coalesce(o.is_blocked, false) = false
  )
$$;

-- Accountant can see companies in the portfolio; company users see only their tenant.
drop policy if exists "org_select" on organizations;
create policy "org_select" on organizations
  for select using (
    id = get_user_org_id()
    or (get_user_role() = 'contador' and owner_accountant_id = auth.uid())
  );

drop policy if exists "org_update" on organizations;
create policy "org_update" on organizations
  for update using (
    get_user_role() = 'contador'
    and owner_accountant_id = auth.uid()
  );

-- Company data remains tenant-scoped; accountant access to company details will be
-- implemented through server actions after the portfolio screens exist.
drop policy if exists "profile_select" on profiles;
create policy "profile_select" on profiles
  for select using (
    id = auth.uid()
    or (
      get_user_role() = 'cliente_admin'
      and organization_id = get_user_org_id()
    )
    or (
      get_user_role() = 'contador'
      and exists (
        select 1 from organizations o
        where o.id = profiles.organization_id
          and o.owner_accountant_id = auth.uid()
      )
    )
  );

drop policy if exists "profile_update" on profiles;
create policy "profile_update" on profiles
  for update using (
    id = auth.uid()
    or (
      get_user_role() = 'cliente_admin'
      and organization_id = get_user_org_id()
      and role = 'cliente_usuario'
    )
  );

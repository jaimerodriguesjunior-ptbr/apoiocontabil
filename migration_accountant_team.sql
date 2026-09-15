create table if not exists public.accountant_team_members (
  owner_accountant_id uuid not null references public.profiles(id) on delete cascade,
  accountant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_accountant_id, accountant_id),
  unique (accountant_id),
  check (owner_accountant_id <> accountant_id)
);

create index if not exists accountant_team_members_owner_idx on public.accountant_team_members (owner_accountant_id);
alter table public.accountant_team_members enable row level security;

drop policy if exists "accountant_team_members_select" on public.accountant_team_members;
create policy "accountant_team_members_select" on public.accountant_team_members
  for select using (owner_accountant_id = auth.uid() or accountant_id = auth.uid());

create or replace function public.is_accountant_team_member(owner_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.accountant_team_members where owner_accountant_id = owner_id and accountant_id = auth.uid())
$$;

create or replace function public.can_access_org(target_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles p left join organizations o on o.id = target_org_id
    where p.id = auth.uid() and coalesce(p.is_active, false) = true
      and (p.organization_id = target_org_id or (p.role = 'contador' and (o.owner_accountant_id = p.id or public.is_accountant_team_member(o.owner_accountant_id))))
      and coalesce(o.is_blocked, false) = false
  )
$$;

drop policy if exists "org_select" on public.organizations;
create policy "org_select" on public.organizations for select using (
  id = public.get_user_org_id() or (public.get_user_role() = 'contador' and (owner_accountant_id = auth.uid() or public.is_accountant_team_member(owner_accountant_id)))
);

drop policy if exists "org_update" on public.organizations;
create policy "org_update" on public.organizations for update using (
  public.get_user_role() = 'contador' and (owner_accountant_id = auth.uid() or public.is_accountant_team_member(owner_accountant_id))
);

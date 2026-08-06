-- Correcao de seguranca para a RPC de numeracao NF-e ja publicada.
create or replace function public.get_next_nfe_number(
  p_org_id uuid,
  p_serie integer,
  p_environment text default 'homologation'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_number integer;
begin
  if p_org_id is distinct from public.get_user_org_id() then
    raise exception 'Nao autorizado a reservar numeracao desta empresa';
  end if;

  if p_serie is null or p_serie <= 0 then
    raise exception 'Serie NF-e invalida';
  end if;

  if p_environment not in ('production', 'homologation') then
    raise exception 'Ambiente fiscal invalido';
  end if;

  insert into public.nfe_sequences (organization_id, serie, environment, last_number)
  values (p_org_id, p_serie, p_environment, 1)
  on conflict (organization_id, serie, environment)
  do update set last_number = public.nfe_sequences.last_number + 1, updated_at = now()
  returning last_number into v_next_number;

  return v_next_number;
end;
$$;

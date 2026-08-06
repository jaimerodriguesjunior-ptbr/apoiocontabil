-- Libera o modulo NF-e nas organizacoes ja criadas.
-- Execute no SQL Editor do Supabase antes de salvar uma empresa com modulo NFe.

alter table public.organizations
  drop constraint if exists organizations_module_access_check;

alter table public.organizations
  add constraint organizations_module_access_check
  check (module_access in ('nfse', 'nfce', 'nfe', 'nfse_nfce'));

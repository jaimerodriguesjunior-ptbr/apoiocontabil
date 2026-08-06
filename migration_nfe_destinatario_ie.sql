-- Dados fiscais do destinatario para NF-e modelo 55.
-- Execute no SQL Editor do Supabase nos ambientes que ja possuem a tabela clients.
alter table public.clients
  add column if not exists inscricao_estadual text,
  add column if not exists ind_ie_dest integer;

alter table public.clients
  drop constraint if exists clients_ind_ie_dest_check;

alter table public.clients
  add constraint clients_ind_ie_dest_check check (ind_ie_dest in (1, 2, 9));

-- O dashboard filtra documentos de entrada pela coluna direction.
-- A coluna precisa existir também nas instalações anteriores ao módulo de NF-e.
alter table if exists public.fiscal_invoices
  add column if not exists direction text;

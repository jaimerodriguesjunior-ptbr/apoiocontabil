# Checklist de teste manual do MVP

## Preparacao
- [ ] Rodar todas as migrations no Supabase, nesta ordem:
  - [ ] `migration.sql`
  - [ ] `migration_batch_origin.sql`
  - [ ] `migration_mvp_foundation.sql`
  - [ ] `migration_catalog_items.sql`
  - [ ] `migration_expenses.sql`
  - [ ] `migration_fixed_expenses.sql`
- [ ] Confirmar `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Reiniciar o servidor local apos alterar `.env.local`.

## Fluxo contador
- [ ] Criar uma conta em `/cadastro`.
- [ ] Confirmar que apos login cai em `/empresas`.
- [ ] Criar uma empresa em `/empresas/nova`.
- [ ] Preencher dados fiscais minimos para NFSe.
- [ ] Criar um usuario `cliente_admin` para a empresa.
- [ ] Criar um usuario `cliente_usuario` para a empresa.
- [ ] Resetar senha de um usuario e testar novo login.
- [ ] Bloquear empresa e confirmar que usuario da empresa nao entra.
- [ ] Desbloquear empresa e confirmar acesso novamente.

## Fluxo empresa
- [ ] Login como `cliente_admin`.
- [ ] Confirmar que nao acessa `/empresas`.
- [ ] Confirmar que nao aparece configuracao da empresa.
- [ ] Cadastrar tomador em `/clientes`.
- [ ] Cadastrar itens em `/catalogo`:
  - [ ] um servico;
  - [ ] um produto.
- [ ] Emitir nota com apenas produto e confirmar bloqueio NFCe fase 2.
- [ ] Emitir nota com servico e confirmar envio NFSe.
- [ ] Emitir nota mista e confirmar que produtos sao ignorados no MVP.
- [ ] Conferir nota em `/notas`.
- [ ] Testar emissao em lote em `/lote`.

## Despesas
- [ ] Lancar despesa avulsa em `/despesas`.
- [ ] Confirmar que aparece nas ultimas despesas.
- [ ] Confirmar total do mes e do ano.
- [ ] Confirmar modal mensal ao entrar, mesmo sem despesa fixa manual cadastrada.
- [ ] Confirmar que aparecem FGTS, INSS, Folha de Pgto, Compras, Aluguel, Contador e Socios com valor zero.
- [ ] Confirmar que o botao fechar aparece apos 5 segundos.
- [ ] Preencher uma despesa fixa e confirmar que ela vira linha lancada com valor.
- [ ] Clicar na linha lancada, alterar o valor e confirmar atualizacao no mes corrente.
- [ ] Login como `cliente_usuario` e confirmar que nao consegue cadastrar despesas fixas manuais.

## Regressao fiscal
- [ ] Testar emissao NFSe GuaÃ­ra.
- [ ] Testar emissao NFSe Toledo.
- [ ] Confirmar mensagens de erro da Nuvem Fiscal quando faltar configuracao.
- [ ] Confirmar que lote nao duplica emissao do mesmo mes.

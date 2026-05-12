# MVP - Emissor Fiscal para Contabilidade

## 1. Objetivo do MVP
- Entregar um sistema web multi-tenant para escritÃ³rio contÃ¡bil gerenciar empresas clientes.
- Manter o motor atual de emissÃ£o **NFSe** (incluindo **emissÃ£o em lote** para GuaÃ­ra/Toledo).
- Oferecer operaÃ§Ã£o simples para o cliente final: emitir nota e lanÃ§ar despesas.

## 2. Perfis e responsabilidades

### 2.1 Contador
- Login Ãºnico com acesso Ã  carteira de empresas.
- Cadastra e configura toda a empresa (dados fiscais, certificado, municÃ­pio, parÃ¢metros de emissÃ£o).
- Cadastra usuÃ¡rios da empresa em aba interna de "UsuÃ¡rios".
- Define senha inicial dos usuÃ¡rios criados.
- Pode resetar senha de usuÃ¡rios da empresa.
- Pode bloquear/desbloquear a empresa inteira.
- NÃ£o opera emissÃ£o no dia a dia da empresa.
- NÃ£o desativa funcionÃ¡rio individualmente.

### 2.2 Cliente Admin (`cliente_admin`)
- Opera o sistema da prÃ³pria empresa.
- Emite NFSe unitÃ¡ria e em lote.
- LanÃ§a despesas avulsas.
- Cadastra e mantÃ©m despesas fixas da empresa.
- Pode desativar/reativar usuÃ¡rios funcionÃ¡rios (`cliente_usuario`) da prÃ³pria empresa.

### 2.3 Cliente UsuÃ¡rio (`cliente_usuario`)
- Opera o sistema da prÃ³pria empresa.
- Emite NFSe unitÃ¡ria e em lote.
- LanÃ§a despesas avulsas.
- NÃ£o acessa cadastro/configuraÃ§Ã£o de empresa.
- NÃ£o gerencia usuÃ¡rios.

## 3. Regras de acesso
- Isolamento por tenant (empresa): cada usuÃ¡rio vÃª apenas dados da prÃ³pria empresa.
- Tela/rota de configuraÃ§Ã£o da empresa nÃ£o aparece para perfis de cliente.
- Cadastro da empresa existe apenas no painel do contador.
- UsuÃ¡rio desativado perde acesso, mantendo histÃ³rico.
- NÃ£o haverÃ¡ troca obrigatÃ³ria de senha no primeiro acesso.

## 4. Escopo fiscal do MVP
- **Dentro do MVP:** NFSe unitÃ¡ria + NFSe em lote (manter comportamento atual).
- **Fora do MVP (fase posterior):** emissÃ£o operacional de NFCe.
- HabilitaÃ§Ã£o por mÃ³dulo por empresa deve existir com 3 opÃ§Ãµes:
  - NFSe
  - NFCe
  - NFSe + NFCe

## 5. Itens para emissÃ£o
- Cadastro por empresa (tenant), com campos:
  - Nome
  - Tipo (`produto` ou `serviÃ§o`)
  - Valor
  - NCM
- Regras no fluxo de emissÃ£o:
  - Se houver serviÃ§os: emitir NFSe para a parte de serviÃ§o.
  - Se houver apenas produtos: bloquear emissÃ£o e informar que NFCe ficarÃ¡ para fase 2.
  - EmissÃ£o mista: separar automaticamente e seguir apenas com NFSe (serviÃ§os).

## 6. Despesas avulsas
- Campos do lanÃ§amento:
  - Valor gasto
  - Onde foi gasto
  - ObservaÃ§Ã£o opcional
- Sem aprovaÃ§Ã£o no MVP.
- EdiÃ§Ã£o/exclusÃ£o de despesas lanÃ§adas: apenas `cliente_admin`.

## 7. Despesas fixas (controle mensal)
- Cadastro de despesas fixas Ã© exclusivo de `cliente_admin`.
- Exemplos esperados: INSS, aluguel, salÃ¡rios, luz, internet, telefone, contador e outros.
- Na entrada do cliente:
  - abrir modal obrigatorio mensal sempre que o cliente entrar;
  - exibir os campos fixos: FGTS, INSS, Folha de Pgto, Compras, Aluguel, Contador e Socios;
  - botao fechar (`X`) so aparece apos 5 segundos.
- Regra mensal:
  - a cada virada de mes, os campos reaparecem com valor zero para o mes atual;
  - ao preencher uma despesa, o sistema lanca em despesas e a linha passa a mostrar o valor lancado;
  - ao clicar em uma linha ja lancada, abre modal para alterar apenas aquela despesa do mes corrente;
  - outras despesas avulsas lancadas na tela de gastos nao aparecem nessa abertura rigida.
- Controle mensal considerado: somente mes atual (nao acumula mes anterior).

## 8. PainÃ©is e navegaÃ§Ã£o

### 8.1 Painel do contador
- Entrada por lista de empresas.
- Sem dashboard global automÃ¡tico com alertas.
- PendÃªncias e indicadores aparecem ao abrir o detalhe de cada empresa.
- VisÃ£o esperada no detalhe da empresa:
  - configuraÃ§Ã£o incompleta;
  - certificado ausente/vencido;
  - notas com erro/rejeiÃ§Ã£o;
  - comparativo de movimentaÃ§Ã£o.

### 8.2 Painel do cliente
- Tela simples com foco em:
  - Emitir nota
  - LanÃ§ar despesas
- Sem acesso Ã s telas de configuraÃ§Ã£o da empresa.

## 9. Comparativo gerencial
- PerÃ­odo: anual acumulado do ano corrente.
- Exibir valores de notas emitidas x despesas lanÃ§adas.
- NÃ£o exibir semÃ¡foro/status automÃ¡tico no MVP (apenas nÃºmeros/indicadores).

## 10. Marca no MVP
- Nome provisÃ³rio fixo.
- PersonalizaÃ§Ã£o por empresa ficarÃ¡ para etapa futura.

## 10.1 DireÃ§Ã£o visual do MVP
- Contador: desktop first, com navegaÃ§Ã£o lateral fixa, telas densas, tabelas e abas para operaÃ§Ã£o de escritÃ³rio.
- Empresa: mobile first, com navegaÃ§Ã£o inferior, aÃ§Ãµes grandes e fluxo simples para emitir nota e lanÃ§ar despesas.
- Linguagem visual: SaaS contÃ¡bil calmo + app financeiro simples.
- Paleta base: fundo claro quente, texto grafite, aÃ§Ã£o principal em verde petrÃ³leo/teal, alerta Ã¢mbar e erro vermelho discreto.
- Evitar layout com cara de template genÃ©rico azul; a lÃ³gica fiscal deve ser reaproveitada, mas a interface deve evoluir para uma base nova.

## 11. Plano de implementaÃ§Ã£o por fases (checklist)

### Fase 0 - PreparaÃ§Ã£o e seguranÃ§a de base
- [ ] Confirmar migraÃ§Ãµes atuais no banco novo (schema principal + lote).
- [ ] Validar que emissÃ£o NFSe unitÃ¡ria e em lote continuam operando no ambiente atual.
- [ ] Congelar escopo do MVP v1 (sem NFCe operacional).
- [ ] Definir backup/rollback mÃ­nimo para mudanÃ§as de schema.

### Fase 1 - Dados e modelagem multi-perfil
- [x] Criar estrutura de papÃ©is: `contador`, `cliente_admin`, `cliente_usuario`.
- [x] Criar vÃ­nculo carteira do contador -> empresas atendidas.
- [x] Adicionar status de bloqueio da empresa (ativo/bloqueado).
- [x] Estruturar usuÃ¡rios por empresa para gestÃ£o na aba interna do contador.
- [x] Criar tabela de catÃ¡logo de itens por empresa (nome, tipo, valor, NCM).
- [x] Criar tabela de despesas avulsas por empresa.
- [x] Criar estrutura de despesas fixas (modelo de itens fixos + preenchimento mensal).
- [x] Incluir flags de mÃ³dulo por empresa (NFSe, NFCe, NFSe+NFCe).

### Fase 2 - Auth, autorizaÃ§Ã£o e guards
- [x] Aplicar autorizaÃ§Ã£o por papel em rotas server/client.
- [x] Bloquear acesso de perfis cliente Ã s telas de configuraÃ§Ã£o da empresa.
- [x] Garantir isolamento por tenant em todas as consultas e gravaÃ§Ãµes novas.
- [x] Aplicar bloqueio de empresa no login/uso operacional.
- [x] Permitir reset de senha por contador na gestÃ£o de usuÃ¡rios da empresa.
- [ ] Permitir desativaÃ§Ã£o de `cliente_usuario` somente por `cliente_admin`.

### Fase 3 - Painel do contador
- [x] Criar lista de empresas da carteira.
- [ ] Criar detalhe da empresa com abas:
  - [x] ConfiguraÃ§Ã£o fiscal da empresa.
  - [x] UsuÃ¡rios da empresa (criar, editar, resetar senha).
  - [ ] VisÃ£o operacional (emissÃµes, despesas, pendÃªncias no detalhe).
- [ ] Implementar aÃ§Ã£o de bloquear/desbloquear empresa.
- [ ] Remover dependÃªncia de dashboard global de alertas automÃ¡ticos.

### Fase 4 - Painel do cliente (fluxo simples)
- [ ] Ajustar home do cliente para foco em dois caminhos: emitir nota e lanÃ§ar despesas.
- [ ] Garantir ocultaÃ§Ã£o total de cadastro/configuraÃ§Ã£o da empresa.
- [x] Implementar comparativo anual acumulado (ano corrente), sem semÃ¡foro automÃ¡tico.
- [x] Exibir totais gerenciais de notas e despesas no formato simples.

### Fase 5 - EmissÃ£o (mantendo motor NFSe)
- [x] Reaproveitar fluxo existente de NFSe unitÃ¡ria.
- [ ] Reaproveitar fluxo existente de NFSe em lote para perfis cliente.
- [x] Adaptar emissÃ£o por itens com separaÃ§Ã£o automÃ¡tica por tipo.
- [x] Se apenas produto: bloquear e informar NFCe fase 2.
- [x] Se emissÃ£o mista: processar somente parte de serviÃ§o (NFSe).
- [ ] Validar compatibilidade com regras atuais de GuaÃ­ra/Toledo.

### Fase 6 - Despesas avulsas e despesas fixas
- [x] Implementar CRUD de despesas avulsas (com ediÃ§Ã£o/exclusÃ£o sÃ³ por `cliente_admin`).
- [x] Implementar cadastro de despesas fixas (apenas `cliente_admin`).
- [x] Implementar modal obrigatÃ³rio no login do cliente:
  - [x] Exibir pendÃªncias do mÃªs atual.
  - [x] Liberar botÃ£o de fechar apenas apÃ³s 5 segundos.
  - [x] Sumir item preenchido no mÃªs.
  - [x] Sumir lista apÃ³s todos preenchidos.
- [x] Garantir virada mensal com reinÃ­cio de pendÃªncias (somente mÃªs corrente).

### Fase 7 - QA funcional e aceite MVP
- [ ] Testar permissÃµes por papel (contador/admin/usuÃ¡rio).
- [ ] Testar bloqueio de empresa e impacto no acesso.
- [ ] Testar criaÃ§Ã£o/reset/desativaÃ§Ã£o de usuÃ¡rios com regras corretas.
- [ ] Testar emissÃ£o NFSe unitÃ¡ria e lote ponta a ponta.
- [ ] Testar cenÃ¡rios com itens de serviÃ§o, produto e misto.
- [ ] Testar fluxo completo de despesas fixas mensais.
- [ ] Testar comparativo anual acumulado.
- [x] Criar roteiro de teste manual ponta a ponta.

### Fase 8 - Go-live do MVP
- [ ] RevisÃ£o final do documento com o contador.
- [ ] Seed mÃ­nimo para ambiente inicial (empresa, usuÃ¡rios e itens base).
- [ ] Checklist de publicaÃ§Ã£o e validaÃ§Ã£o pÃ³s-subida.
- [ ] Coleta de feedback operacional para fase 2 (NFCe real e personalizaÃ§Ãµes).

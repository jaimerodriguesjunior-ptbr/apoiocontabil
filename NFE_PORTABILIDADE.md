# Planejamento de Implementação da NF-e (Modelo 55) no Apoio Contábil

Este documento detalha o plano de portabilidade do módulo de emissão de NF-e da `autoeletrica`/`gestao-otica-pro` para o projeto `apoio-contabil`, adaptando-o ao contexto de uma plataforma SaaS para contadores e seus clientes.

## 1. Banco de Dados e Schemas
- **Sequencial NF-e:** Criar tabela `nfe_sequences` para controle atômico da numeração por tenant (`organization_id`), `serie` e `environment` (homologação/produção).
- **Configuração de Série:** Adicionar o campo `nfe_serie` (padrão '1') na tabela `company_settings`.
- **Tabela de Participantes (Evolução de `clients`):** Manter o nome atual da tabela `clients` (para preservar o código em produção) e adicionar novas colunas e flags para suportar emissão completa de NFe. Campos a adicionar:
  - Flags: `is_supplier` (boolean), `is_transporter` (boolean). O comportamento default de "cliente" já é suprido.
  - Campos técnicos: `codigo_municipio_ibge` (se não existir de forma compatível), `inscricao_estadual`, `is_taxpayer` (indicador de IE).
- **Invoices Fiscais:** Atualizar a tabela `fiscal_invoices` para suportar chaves estrangeiras de operações referenciadas (`nf_ref`), volumes, novos metadados da SEFAZ, e payload técnico completo para Modelo 55.

## 2. Backend Actions & Helpers
- **Integração:** Importar e adaptar helpers do Nuvem Fiscal para validação estrutural, manipulação do payload JSON e parsing do XML.
- **Portabilidade:** Portar as server actions de emissão de NFe da autoeletrica/otica, adaptando a injeção do `organization_id` no lugar de OS/Store.
- **Polling / Webhook:** Implementar webhook ou polling background de recuperação de status e XML quando a SEFAZ estiver processando a nota.
- **Auditoria com IA:** Portar a chamada de IA na validação da "Outra Operação Assistida", garantindo que a resposta apresente os riscos e sugira contato com o contador.

## 3. Interface do Cliente (`/emitir/nfe`)
- **Rota Dedicada:** Criar rota `src/app/(dashboard)/emitir/nfe/page.tsx` baseada no "Wizard" de 5 etapas da autoeletrica. A página existente `/emitir` será preservada inicialmente, focando na emissão de NFS-e ou atuando como direcionador.
- **Etapas do Wizard NFe:**
  1. Operação (Venda, Devolução, Remessa, etc)
  2. Participante (integrado à tabela `clients`, que agora terá busca filtrada por fornecedores/transportadoras conforme as novas flags)
  3. Itens (com auto-preenchimento ou tributação embutida nos templates guiados)
  4. Transporte e Pagamento
  5. Revisão Fiscal e Submissão
- **Assunção de Risco na Emissão ("Outra Operação"):** O cliente usará a IA para conferir a operação. Caso a IA levante pontos de alerta, o cliente será orientado a falar com o contador. No entanto, **o cliente terá total autonomia para prosseguir e emitir a nota** (ex: botão "Estou ciente e desejo emitir"), assumindo o risco pela operação sem criar bloqueios rígidos no sistema.

## 4. Interface do Contador
- **Campos Fiscais:** Atualizar a aba de configuração/detalhamento da empresa no painel do contador (`src/app/(dashboard)/empresas/[id]/configuracao`) para exibir e editar os novos dados fiscais requeridos pela NF-e (Série da NF-e, Regime Tributário, etc).
- **Rastreamento:** Notas emitidas pelo cliente com aviso de risco (Outra Operação) poderão ser sinalizadas no histórico para simples conferência posterior pelo escritório contábil, sem que haja uma etapa de "aprovação prévia obrigatória".

## 5. Plano de Verificação

### Testes Manuais Focais
- **Emissão Guiada:** Acessar o ambiente como `cliente_usuario` e emitir uma Venda Simples. Verificar se a nota assume CFOP correto automaticamente, é autorizada, e se a numeração evolui na tabela `nfe_sequences`.
- **Evolução de Clientes:** Preencher um novo participante marcando como fornecedor, e inserir `inscricao_estadual`. Emitir uma nota de Devolução contra ele.
- **Assunção de Risco:** Iniciar uma "Outra Operação Assistida" com parâmetros possivelmente conflitantes. Receber a auditoria da IA, ignorar os alertas confirmando o risco, emitir a nota e checar a recepção na Nuvem Fiscal.
- **Visão do Contador:** Logar como contador, acessar a página da empresa do cliente e verificar as novas propriedades fiscais.

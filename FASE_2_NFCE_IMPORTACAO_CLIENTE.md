# Fase 2 - NFC-e, Importacao XML e Operacao do Cliente

## Objetivo

Este documento define a proxima etapa do `apoio-contabil` para cobrir duas frentes complementares:

1. **Role do contador**
   - ampliar o cadastro/configuracao da empresa cliente com os dados necessarios para NFC-e;
   - salvar esses dados no `apoio-contabil`;
   - injetar esses dados na API local `..\nuvem-local-fiscal`.

2. **Role do cliente do contador**
   - manter uma experiencia mobile-first e simples;
   - incluir produtos;
   - incluir emissao de NFC-e;
   - incluir importacao de XML;
   - responder com clareza as perguntas:
     - "Quanto de nota esse cliente comprou?"
     - "Quanto de nota ele emitiu?"

Este repo **ja e multi-tenant** e deve continuar assim. Toda nova persistencia e toda nova tela devem respeitar `organization_id` como isolamento principal.

## Estado atual do repo

- O cadastro da empresa do contador ja existe e salva em `organizations` + `company_settings`.
- A tela principal desse fluxo hoje esta em `src/app/(dashboard)/empresas/EmpresaForm.tsx`.
- O sistema ja possui modulos por empresa via `module_access`, com suporte visual para `nfse`, `nfce` e `nfe`.
- O cliente ja opera com navegacao mobile-first, incluindo menu inferior com:
  - `Nova Nota`
  - `Clientes`
  - `Itens`
  - `Gastos`
  - `Notas`
- A emissao atual em `/emitir` ainda e focada em NFSe.
- O catalogo ja diferencia `produto` e `servico`.
- Ja existe integracao com Nuvem Fiscal para token com escopo `empresa nfce nfe nfse`.
- Ja existe endpoint local para upload de certificado, mas hoje ele conversa no formato atual com a Nuvem Fiscal e nao com a `nuvem-local-fiscal` como fonte principal desta nova fase.

## Direcao geral desta fase

- A implementacao deve ser **homologacao-first**.
- A `nuvem-local-fiscal` sera tratada como a API local de destino para receber e centralizar os dados fiscais da empresa.
- Os campos de **producao** ja devem existir desde agora, mas o uso operacional de producao fica preparado e nao virado por padrao neste momento.
- A experiencia do cliente deve continuar simples. O objetivo nao e transformar o sistema em ERP pesado.
- A importacao XML, nesta primeira fase, deve ser **contabil e gerencial**, nao orientada a estoque.

---

## Parte 1 - Role do contador

### Objetivo funcional

Ao cadastrar ou editar uma empresa no painel do contador, o usuario deve conseguir informar todos os dados necessarios para preparar a NFC-e da empresa cliente, salvar isso localmente no `apoio-contabil` e sincronizar esses dados com a `..\nuvem-local-fiscal`.

### Onde isso entra

Base oficial: `src/app/(dashboard)/empresas/EmpresaForm.tsx`

Nao criar uma area paralela fora do detalhe da empresa. A configuracao deve continuar concentrada no fluxo que o contador ja usa hoje.

### Estrutura sugerida no formulario da empresa

Manter as secoes atuais e acrescentar uma secao dedicada de **NFC-e** dentro da configuracao fiscal da empresa.

#### 1. Dados fiscais ja existentes que continuam sendo base

Esses dados continuam sendo a base da empresa emissora e devem ser reaproveitados pela sincronizacao:

- CNPJ
- razao social
- nome fantasia
- inscricao estadual
- regime tributario
- codigo do municipio IBGE
- cidade
- UF
- CEP
- logradouro
- numero
- complemento
- bairro
- email de contato
- telefone

#### 2. Novos campos de NFC-e

Adicionar em `company_settings` campos equivalentes a:

- `nfce_serie`
- `nfce_environment_default`

#### 3. Credenciais por ambiente

Separar homologacao e producao, cada uma com seus proprios dados.

##### Homologacao

- `nfce_certificate_hom_content`
  - campo para colar conteudo do certificado em base64/texto
- `nfce_certificate_hom_password`
- `nfce_csc_hom_token_id`
- `nfce_csc_hom_code`

##### Producao

- `nfce_certificate_prod_content`
  - campo para colar conteudo do certificado em base64/texto
- `nfce_certificate_prod_password`
- `nfce_csc_prod_token_id`
- `nfce_csc_prod_code`

#### 4. Campos auxiliares de integracao

- `nfce_sync_status_hom`
- `nfce_sync_status_prod`
- `nfce_sync_message_hom`
- `nfce_sync_message_prod`
- `nfce_last_sync_at_hom`
- `nfce_last_sync_at_prod`

Esses campos podem ser persistidos na propria `company_settings` ou em uma tabela auxiliar de sync, desde que a leitura no detalhe da empresa fique simples.

### Comportamento ao salvar

Fluxo desejado:

1. O contador salva a empresa no `apoio-contabil`.
2. O sistema persiste primeiro em `organizations` e `company_settings`.
3. Depois da persistencia local, o sistema dispara a sincronizacao para `..\nuvem-local-fiscal`.
4. A sincronizacao deve acontecer separando:
   - cadastro basico da empresa emissora;
   - certificado por ambiente;
   - CSC por ambiente.
5. O resultado da sincronizacao deve voltar ao formulario de forma clara.

### Regra de ouro desta fase

Persistencia local primeiro, integracao depois.

Se a integracao falhar, o contador nao pode perder o que digitou. O sistema deve salvar localmente e informar que a sincronizacao ficou pendente ou falhou.

### Contrato esperado com `..\nuvem-local-fiscal`

Esta fase assume que vamos criar ou ajustar endpoints claros na API local para os seguintes casos:

#### 1. Upsert da empresa emissora

Responsabilidade:

- receber os dados cadastrais/fiscais base da empresa;
- criar ou atualizar a empresa na API local;
- guardar relacao com o identificador do `organization_id` do `apoio-contabil`.

Payload esperado, em alto nivel:

- `externalCompanyId` = `organization_id`
- `cnpj`
- `razaoSocial`
- `nomeFantasia`
- `inscricaoEstadual`
- `regimeTributario`
- `endereco`
- `email`
- `telefone`

#### 2. Upload/salvamento do certificado por ambiente

Responsabilidade:

- vincular certificado a empresa e ambiente corretos;
- aceitar o conteudo colado;
- salvar senha do certificado de forma segura;
- responder com status claro.

Payload esperado:

- `externalCompanyId`
- `environment` = `homologation` ou `production`
- `certificateContent`
- `certificatePassword`

#### 3. Upsert do CSC por ambiente

Responsabilidade:

- salvar `idToken` e `CSC` por empresa e ambiente;
- permitir atualizar apenas um ambiente sem afetar o outro.

Payload esperado:

- `externalCompanyId`
- `environment`
- `tokenId`
- `csc`

#### 4. Consulta de status de sincronizacao

Responsabilidade:

- informar se a empresa esta pronta para homologacao;
- informar se os dados de producao existem, mesmo sem uso operacional ainda;
- detalhar faltas ou erros.

### Importante sobre homologacao e producao

- A homologacao e a prioridade operacional desta fase.
- A producao deve ficar preparada em dados e contrato.
- A emissao real em producao usando a `nuvem-local-fiscal` fica para a virada planejada no proximo mes.
- O documento deve tratar qualquer botao ou fluxo de producao como "preparado, mas nao ativado por padrao".

### Ajuste no checklist de Suporte TI

A secao atual de `Suporte TI` em `EmpresaForm` ja tem grupo de `NFCe`.

Ela deve evoluir para refletir a nova realidade, incluindo pelo menos:

- certificado homologacao inserido
- CSC homologacao inserido
- sync homologacao com API local concluida
- certificado producao inserido
- CSC producao inserido
- sync producao com API local concluida
- liberacao operacional de producao pendente

---

## Parte 2 - Role do cliente do contador

### Objetivo funcional

Dar ao cliente um fluxo simples e mobile-first para:

- cadastrar produtos;
- emitir NFC-e;
- importar XML;
- acompanhar o que foi emitido e o que foi importado.

### Principio de UX desta fase

Nao inflar o menu inferior com mais um monte de botao.

A navegacao atual ja tem bons pontos de entrada:

- `Itens`
- `Nova Nota`
- `Notas`

Vamos reaproveitar esses pontos em vez de multiplicar destinos.

---

## Parte 3 - Onde colocar cada coisa

### 1. NFC-e

**Decisao:** colocar dentro da area de emissao que ja existe.

#### Como fica

A rota `/emitir` deixa de ser uma pagina pensada so para NFSe e passa a funcionar como uma area de emissao com abas ou seletor visivel:

- `NFSe`
- `NFCe`

#### Motivo

- o botao mobile `Nova Nota` ja existe e ja educa o usuario para esse ponto de entrada;
- evita criar menu novo;
- mantem o conceito de "emitir documento" no mesmo lugar.

#### Regra de exibicao

As abas/opcoes devem respeitar `module_access` da empresa:

- empresa com `nfse`: mostra NFSe;
- empresa com `nfce`: mostra NFCe;
- empresa com ambos: mostra ambas;
- empresa sem o modulo habilitado: nao exibe a opcao.

### 2. Produtos

**Decisao:** manter em `Itens` / catalogo.

#### Como fica

O menu de polegar continua com `Itens`.

Dentro dessa area, o fluxo de produto deve ser fortalecido para suportar melhor a NFC-e, incluindo campos fiscais minimos necessarios para emissao.

#### Direcao tecnica

A inspiracao principal deve vir de `..\autoeletrica`, porque o cadastro de produto de la tende a estar mais perto do que precisamos aqui.

Mesmo assim, toda adaptacao deve respeitar a estrutura multi-tenant deste repo.

### 3. Importacao XML

**Decisao:** colocar dentro da area `Notas`, nao como novo botao inferior.

#### Como fica

A area `/notas` deixa de ser apenas lista de notas emitidas e passa a concentrar tambem a importacao e a visao consolidada de documentos.

Estrutura sugerida:

- `Emitidas`
- `Importar XML`
- `Importadas`

#### Motivo

- XML importado e documento fiscal, nao um cadastro primario;
- evita criar sexto botao no mobile;
- mantem o conceito de historico/documentos em um lugar so.

---

## Parte 4 - Produtos

### Objetivo desta frente

Permitir que o cliente use o catalogo atual como base real para a NFC-e.

### Base recomendada

Inspiracao principal: `..\autoeletrica`

### O que precisa evoluir no `apoio-contabil`

O cadastro de produto atual ja diferencia `produto` e `servico`, mas para NFC-e vamos precisar fortalecer principalmente os itens do tipo `produto`.

Campos minimos desejados para produto:

- nome
- valor padrao
- NCM
- unidade comercial
- CFOP padrao opcional
- codigo interno opcional
- origem da mercadoria opcional

### Escopo

Nao precisamos transformar isso em controle de estoque agora.

O objetivo nesta fase e:

- permitir emitir melhor;
- permitir conciliar melhor importacoes;
- permitir visao contabil/gerencial melhor.

---

## Parte 5 - Emissao de NFC-e

### Objetivo desta frente

Permitir ao cliente emitir NFC-e a partir do catalogo de produtos, aproveitando os dados fiscais configurados pelo contador e sincronizados com a `nuvem-local-fiscal`.

### Base recomendada

Inspiracao principal: `..\autoeletrica`

### Direcao de implementacao

O fluxo de NFC-e deve ser separado do fluxo atual de NFSe, mesmo compartilhando a entrada `/emitir`.

Isso significa:

- interface propria para NFC-e;
- payload proprio para NFC-e;
- validacoes proprias para produto;
- historico proprio em `fiscal_invoices` ou estrutura equivalente, identificando claramente `tipo_documento = NFCe`.

### Regras esperadas

- se a empresa nao tiver sync homologacao completo, a aba NFC-e deve mostrar pendencia clara;
- se faltar certificado ou CSC, o cliente nao deve ficar tentando adivinhar o problema;
- se a empresa estiver com producao preenchida, isso nao liga producao automaticamente;
- a primeira experiencia operacional deve continuar apontando para homologacao.

### Resultado esperado no negocio

Ao fim desta frente, sera possivel responder:

- quanto o cliente emitiu em NFSe;
- quanto o cliente emitiu em NFCe;
- quanto emitiu no total.

---

## Parte 6 - Importacao XML

### Objetivo principal

Nesta fase, a importacao XML **nao existe para atualizar estoque como objetivo principal**.

Ela existe para responder melhor a pergunta contabil:

- "Quanto de nota esse cliente comprou?"

### Base recomendada

Inspiracao principal: `..\autoeletrica`

Se algum ponto da visao multi-tenant ou da organizacao das telas ficar melhor resolvido no `..\gestao-otica-pro`, usar la como referencia secundaria.

### Escopo funcional da primeira entrega

#### 1. Upload manual

O cliente ou o contador faz upload de XMLs manualmente.

#### 2. Leitura e fila

O sistema:

- valida o XML;
- extrai chave de acesso;
- extrai emitente/destinatario;
- extrai totais;
- registra o documento como importado para a empresa correta.

#### 3. Persistencia contabil

O foco principal e gerar base para consulta e totalizacao.

Minimo esperado:

- saber se e nota de entrada/compra;
- saber valor total;
- saber emissor;
- saber data;
- saber chave;
- saber ambiente se aplicavel;
- saber status da importacao.

#### 4. Cadastro relacionado

Pode haver aproveitamento para cadastro/sugestao de produto e participante, mas isso nao deve travar a primeira entrega contabil.

### O que nao e prioridade agora

- atualizar estoque como regra principal;
- criar custo medio;
- fechar inventario;
- montar ERP de compras.

### Resultado esperado no negocio

Ao fim desta frente, sera possivel responder:

- quanto de nota o cliente importou como compra/entrada;
- quantos XMLs ja foram importados;
- quais documentos ainda precisam revisao.

---

## Parte 7 - Estrutura de telas sugerida

### Painel do contador

#### Empresa > Cadastro / Configuracao fiscal

Adicionar:

- secao `NFC-e`
- campos de certificado e CSC por ambiente
- status de sync por ambiente
- mensagens de erro/sucesso da integracao local

### Painel do cliente

#### `/emitir`

Transformar em hub de emissao com:

- aba `NFSe`
- aba `NFCe`

#### `/catalogo`

Continuar como entrada de `Itens`, fortalecendo o cadastro de produto.

#### `/notas`

Transformar em area mais completa, com abas:

- `Emitidas`
- `Importar XML`
- `Importadas`

---

## Parte 8 - Persistencia e modelagem

### Multi-tenant

Toda persistencia nova deve respeitar `organization_id`.

Isso vale para:

- dados de sync com a API local;
- credenciais por ambiente;
- importacoes XML;
- notas emitidas;
- itens/produtos;
- indicadores consolidados.

### Campos novos em `company_settings`

Este documento sugere concentrar inicialmente em `company_settings` os dados de configuracao da empresa para NFC-e, porque essa ja e a base usada no cadastro do contador.

Podem ser adicionados, por exemplo:

- `nfce_serie`
- `nfce_certificate_hom_content`
- `nfce_certificate_hom_password`
- `nfce_csc_hom_token_id`
- `nfce_csc_hom_code`
- `nfce_certificate_prod_content`
- `nfce_certificate_prod_password`
- `nfce_csc_prod_token_id`
- `nfce_csc_prod_code`
- `nfce_sync_status_hom`
- `nfce_sync_message_hom`
- `nfce_last_sync_at_hom`
- `nfce_sync_status_prod`
- `nfce_sync_message_prod`
- `nfce_last_sync_at_prod`

Se depois ficar grande demais para `company_settings`, podemos separar credenciais/sync em tabela propria. Mas o primeiro passo pode seguir a estrutura atual para acelerar a entrega.

### Importacao XML

Este repo ja possui um direcionamento inicial em `NFE_IMPORTACAO_XML.md`.

Para esta fase, a modelagem deve priorizar:

- `organization_id`
- chave de acesso
- xml bruto
- metadados principais
- status de importacao
- classificacao de entrada/saida
- relacao opcional com fornecedor/cliente e itens

---

## Parte 9 - Ordem recomendada de implementacao

### Fase A - Base do contador + sync local

1. Expandir `company_settings` com os campos de NFC-e.
2. Atualizar `EmpresaForm` com a nova secao de NFC-e.
3. Ajustar a server action `saveAccountantCompany`.
4. Criar servico de sync com `..\nuvem-local-fiscal`.
5. Exibir status da sync no detalhe da empresa.

### Fase B - Produtos para NFC-e

1. Evoluir o catalogo para produto com mais campos fiscais.
2. Garantir que o mobile continue simples.
3. Ajustar listagens e formulario para uso real na emissao.

### Fase C - Emissao de NFC-e

1. Transformar `/emitir` em hub `NFSe` + `NFCe`.
2. Criar fluxo visual e server action propria para NFC-e.
3. Salvar historico e status de retorno.
4. Integrar com a `nuvem-local-fiscal`.

### Fase D - Importacao XML

1. Criar fila/tabela de importacao.
2. Criar upload e parse.
3. Colocar a entrada em `/notas`.
4. Salvar metadados contabilmente uteis.
5. Exibir totais e lista de importadas.

### Fase E - Visao consolidada

1. Consolidar indicadores de:
   - emitido em NFSe
   - emitido em NFCe
   - importado por XML
2. Facilitar a leitura contabil para contador e cliente.

---

## Parte 10 - Regras de negocio resumidas

### Contador

- configura a empresa;
- salva localmente;
- sincroniza com a API local;
- prepara homologacao agora;
- deixa producao preenchida, mas nao necessariamente ligada.

### Cliente

- usa `Itens` para cadastrar produtos;
- usa `Nova Nota` para emitir NFSe ou NFC-e;
- usa `Notas` para acompanhar emitidas e importar XML.

### Importacao

- foco contabil e gerencial;
- estoque pode existir no futuro, mas nao guia esta fase.

---

## Parte 11 - Criterios de aceite

### Contador

- consegue salvar campos de certificado e CSC por ambiente;
- nao perde digitacao se a sync falhar;
- enxerga status claro de homologacao e producao;
- consegue preparar uma empresa para NFC-e sem sair do fluxo de empresa.

### Cliente

- continua com navegacao mobile simples;
- encontra NFC-e dentro de `Nova Nota`;
- encontra produtos em `Itens`;
- encontra importacao XML dentro de `Notas`.

### Operacao fiscal

- homologacao da NFC-e fica preparada pela API local;
- producao fica documentada e preenchivel, mas nao ativada por padrao;
- o sistema passa a responder melhor:
  - quanto o cliente emitiu;
  - quanto o cliente comprou por XML importado.

---

## Parte 12 - Referencias deste repo

- `MVP.md`
- `NFE_IMPORTACAO_XML.md`
- `NFE_PORTABILIDADE.md`
- `src/app/(dashboard)/empresas/EmpresaForm.tsx`
- `src/actions/empresas.ts`
- `src/app/(dashboard)/emitir/page.tsx`
- `src/app/(dashboard)/emitir/EmitirForm.tsx`
- `src/app/(dashboard)/catalogo/CatalogoForm.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/actions/fiscal.ts`

## Resumo final

Este trabalho nao pede uma explosao de novas telas. A melhor direcao para o `apoio-contabil` nesta fase e:

- **contador** configura a empresa e sincroniza com a `nuvem-local-fiscal`;
- **cliente** continua com um app simples:
  - `Nova Nota` para NFSe/NFC-e
  - `Itens` para produtos
  - `Notas` para emitidas + importacao XML

Assim, o sistema evolui em poder fiscal sem perder a simplicidade operacional que ele precisa ter.

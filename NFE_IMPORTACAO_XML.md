# Planejamento: Importação de XML no Apoio Contábil

Este documento detalha o plano de implementação da funcionalidade de importação de XML (NF-e, NFC-e) no sistema `apoio-contabil`.

A análise foi baseada nas implementações existentes nos projetos `autoeletrica` e `gestao-otica-pro`. Embora a ótica possua um importador sofisticado para lidar com catálogos complexos (grades de lentes, etc), optamos por seguir uma abordagem mais alinhada à da **`autoeletrica`**. O motivo principal é que o importador da autoelétrica lida com a estrutura de produtos e cadastros de forma mais direta (menos focada em multi-tenant complexo e características super-específicas de um nicho), o que se adequa melhor ao contexto contábil/gestão genérica que o Apoio Contábil propõe.

## 1. Banco de Dados e Schemas

Deverá ser criada/adaptada uma tabela de fila de importação para armazenar temporariamente os XMLs e gerenciar o status de conciliação.

**Tabela `nfe_import_queue`:**
- `id` (uuid)
- `organization_id` (relacionamento com a empresa/tenant)
- `chave_acesso` (text, unique por organization)
- `xml_content` (text) - O conteúdo bruto do XML.
- `status` (text) - Ex: `pending`, `imported`, `error`, `ignored`.
- `metadata` (jsonb) - Para guardar informações auxiliares extraídas do XML (resumo de valores, CNPJ emitente, data de emissão) para exibição em lista sem precisar fazer o parse completo toda vez.

**Row Level Security (RLS):**
- Criar policies baseadas no tenant da empresa (`organization_id`).

## 2. Lógica de Parsing (Backend/Lib)

A biblioteca `fast-xml-parser` será utilizada para fazer o parse dos arquivos XML no backend.

**Fluxo de Extração:**
1. O usuário faz o upload do arquivo XML via tela (Drag & Drop).
2. O sistema lê o XML, valida se é uma NF-e (`nfeProc` ou `infNFe`).
3. Extrai a Chave de Acesso, CNPJ Emitente, Destinatário e Totais.
4. Salva (ou atualiza) o registro na tabela `nfe_import_queue` como `pending`.

## 3. Interface de Importação e Pré-visualização

A experiência de usuário terá duas etapas principais:

**Etapa A: Fila de Upload e Listagem**
- Uma tela onde o cliente (ou o contador) pode arrastar dezenas de XMLs de uma vez.
- Lista exibindo as notas que estão na fila (pendentes, importadas, erro).

**Etapa B: Tela de Pré-visualização e Conciliação (Inspirado no padrão Gestão Ótica / Autoelétrica)**
- Ao clicar em uma nota pendente, o sistema extrai (via Server Action) o detalhamento do `xml_content`.
- **Participante (Fornecedor/Cliente):** O sistema checa se o CNPJ do emitente (em nota de entrada) ou destinatário (nota de saída) já existe na tabela `clients` da empresa. Se não, sugere a criação.
- **Itens da Nota:** Lista todos os produtos/serviços contidos no XML. 
  - O sistema tenta fazer o "match" do EAN ou Descrição com a tabela de produtos/serviços da empresa.
  - O usuário pode confirmar se deseja criar um novo produto no catálogo ou mapear para um existente.
- **Botão de Efetivar Importação:** Ao confirmar, o sistema:
  1. Cria os cadastros faltantes (Clientes/Fornecedores e Produtos).
  2. Gera a fatura fiscal (`fiscal_invoices`) e os itens vinculados.
  3. Atualiza a `nfe_import_queue` para `status = 'imported'`.

## 4. Evolução: Download Automático via SEFAZ
Num segundo momento, esta mesma tabela `nfe_import_queue` servirá para receber as notas baixadas automaticamente pela Nuvem Fiscal (Distribuição de DF-e). O motor de conciliação desenvolvido para o upload manual será o mesmo utilizado para os XMLs baixados automaticamente.

## 5. Resumo da Diferenciação (Autoelétrica vs Ótica)
- Optamos pela inspiração na **Autoelétrica** por ter uma política de RLS mais simples e um relacionamento de estoque direto, sem a camada adicional de complexidade exigida por produtos óticos (corredores de adição, materiais específicos, e multi-tenancy rigoroso de catálogos globais da Haytek/Essilor).
- O mapeamento é direto: XML -> Cadastros Básicos (Clientes e Produtos) -> `fiscal_invoices`.

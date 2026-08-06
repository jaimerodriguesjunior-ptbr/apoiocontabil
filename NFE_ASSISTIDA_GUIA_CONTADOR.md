# NF-e assistida — guia de implementação

## Objetivo

A emissão assistida é o fluxo para operações que não podem ser tratadas pela venda simples. Ela deve permitir que o contador conduza o cliente campo a campo, sem esconder decisões fiscais importantes.

A interface pode ser diferente da Autoelétrica, mas o resultado fiscal e as validações devem seguir o mesmo contrato enviado à Nuvem Local Fiscal. A Nuvem Fiscal externa permanece desativada.

## Princípios

- O sistema pode sugerir valores iniciais, mas o contador deve poder editar todos os campos fiscais relevantes.
- A nota deve ser montada em rascunho, revisada e somente então transmitida.
- Cada campo informado deve ser preservado no `payload_json` da nota para auditoria e reprodução do XML.
- Erros de validação devem apontar o campo e o item envolvidos antes de reservar numeração ou transmitir.
- O modo assistido não substitui o contador: ele organiza e valida o preenchimento que foi orientado por ele.

## Fluxo guiado

### 1. Operação

O primeiro passo define o contexto que orienta os demais campos:

- natureza da operação (`natOp`), obrigatória e editável;
- tipo da NF-e: entrada (`tpNF = 0`) ou saída (`tpNF = 1`);
- finalidade: normal, complementar, ajuste ou devolução (`finNFe` 1, 2, 3 ou 4);
- consumidor final (`indFinal`);
- presença do comprador (`indPres`);
- indicador de intermediador (`indIntermed`);
- chave de acesso da NF-e referenciada, quando aplicável.

O sistema deve mostrar sugestões de CFOP conforme operação e UF, mas nunca impedir a alteração feita sob orientação do contador.

### 2. Participante

Permitir selecionar um cliente cadastrado ou informar/ajustar os dados no próprio fluxo, conforme a orientação contábil:

- nome ou razão social;
- CPF/CNPJ;
- indicador de IE do destinatário: contribuinte, contribuinte isento ou não contribuinte;
- inscrição estadual quando o destinatário for contribuinte;
- e-mail e telefone;
- endereço completo: CEP, logradouro, número, complemento, bairro, município, UF e código IBGE.

O fluxo também deve suportar, quando aplicável, endereço de entrega e endereço de retirada distintos do destinatário.

### 3. Itens

Os itens podem partir do catálogo, de uma nota clonada/importada ou ser incluídos manualmente. Cada item deve ser editável de forma independente:

- código, descrição e GTIN quando houver;
- NCM obrigatório e CEST opcional;
- CFOP obrigatório por item;
- código de benefício fiscal (`cBenef`) quando orientado;
- unidade comercial e tributável, quantidade e valor unitário;
- frete, seguro, desconto e outras despesas rateados por item, quando aplicável;
- origem da mercadoria;
- CSOSN/CST;
- IPI: CST, enquadramento, base, alíquota e valor;
- PIS: CST, base, alíquota e valor;
- COFINS: CST, base, alíquota e valor.

As validações mínimas são NCM com oito dígitos, CFOP com quatro dígitos, descrição, unidade, quantidade e valores consistentes. A tributação deve ser compatível com o regime/CRT do emitente e com a orientação recebida.

### 4. Transporte

O frete não pode ficar fixo como "sem ocorrência". O contador deve poder escolher a modalidade de frete (`modFrete`) e, quando existir transporte, preencher:

- transportadora: nome, CPF/CNPJ, IE, endereço, município e UF;
- veículo: placa, UF e RNTRC;
- volumes: quantidade, espécie, marca, numeração, peso líquido e peso bruto.

Se a modalidade exigir transportadora, o CPF/CNPJ deve ser validado antes do envio.

### 5. Cobrança e pagamento

O fluxo deve permitir editar a forma de pagamento. Para operações sem cobrança — por exemplo, determinadas devoluções, ajustes e remessas — deve enviar pagamento `90` com valor zero. Para operações com cobrança, o valor de pagamento deve fechar com o total da nota.

### 6. Informações adicionais e intermediador

Antes da revisão, disponibilizar:

- informações complementares ao contribuinte;
- informações de interesse do fisco;
- dados do intermediador da transação: CNPJ e identificador do cadastro, quando `indIntermed = 1`.

O CNPJ e o identificador do intermediador são obrigatórios quando essa opção for marcada.

### 7. Revisão e transmissão

A revisão deve apresentar, de forma legível:

- ambiente configurado pelo contador: homologação ou produção;
- emitente, destinatário e endereços;
- natureza, tipo, finalidade, indicadores e chave referenciada;
- cada item com CFOP, NCM, valores e tributação;
- totais de produtos, frete, seguro, descontos, outras despesas, impostos e NF-e;
- transporte, pagamento, observações e intermediador;
- responsável técnico e CSRT configurados para o ambiente.

Na transmissão, montar o mesmo payload de modelo 55 usado pela Autoelétrica e enviar exclusivamente à Nuvem Local Fiscal. A resposta deve guardar ID local, número, série, chave, protocolo, XML/PDF e a mensagem detalhada de erro quando houver.

## Grupos IBS/CBS na homologação

Quando o cenário exigir os grupos RTC/IBS/CBS da Nuvem Local Fiscal, o sistema deve adicioná-los por item e no total somente para os CFOPs e finalidades aceitos pelo motor fiscal. O município do fato gerador IBS (`cMunFGIBS`) deve acompanhar o grupo. Não usar grupos fixos fora do cenário aplicável.

## Validação por IA — etapa futura

Não implementar nesta etapa. Quando for adicionada, a IA deve atuar apenas sobre o rascunho, antes da transmissão, e nunca como substituta da decisão do contador.

Ela deve apontar incoerências e perguntas para confirmação, especialmente:

- natureza da operação versus CFOP;
- entrada/saída versus finalidade;
- pagamento versus operação com ou sem cobrança;
- observações versus remessa, retorno, devolução, demonstração, bonificação ou doação;
- origem, CSOSN/CST, IPI, PIS e COFINS versus o contexto fiscal da empresa;
- campos que exigem confirmação do contador.

O parecer precisa separar inconsistências, pontos para confirmar e observações, com aviso claro de que não substitui a revisão contábil.

## Critério de aceite

A emissão assistida estará pronta quando um contador conseguir orientar uma operação completa, alterar todos os campos acima, revisar o payload final e emitir uma NF-e homologada com o mesmo contrato fiscal usado pela Autoelétrica.

# Chamado Técnico Focus NFe - NFSe Homologação

Prezados,

Solicitamos análise técnica da referência **NFT_1771872538691** no ambiente de homologação.

## Dados da tentativa
- cnpj_prestador: 13167722000187
- ref: NFT_1771872538691
- numero_rps: 5001
- serie_rps: 99
- status: erro_autorizacao
- x-request-id (consulta JSON): X-Request-Id: 264b5c41-b308-415f-9ec7-fba7cf946ea1
- x-request-id (endpoint .xml): X-Request-Id: 190957da-ca62-40e8-8aa9-74fc95d83095

## Retorno recebido
- codigo=8011 mensagem=O RPS informado jÃ¡ foi convertido em NFS. Utilize o serviÃ§o esConsultarNfsePorRps antes de enviar o RPS.
- codigo=1601 mensagem=O RPS informado nÃ£o existe.

## Evidências anexas
- consulta_body.json
- consulta_headers.txt
- consulta_xml_body.txt
- consulta_xml_headers.txt
- scenario_invalid_token_headers.txt
- scenario_invalid_token_body.txt
- scenario_ref_inexistente_headers.txt
- scenario_ref_inexistente_body.txt
- meta.json

## Observação sobre XML
O endpoint `/v2/nfse/{ref}.xml` retornou JSON de erro para esta referência (não retornou XML de nota fiscal), e o JSON não contém `caminho_xml_nota_fiscal`.

## Solicitações objetivas
1. Enviar o raw SOAP/XML efetivamente enviado ao provedor municipal para essa referência.
2. Enviar o raw response retornado pelo provedor municipal.
3. Confirmar o mapeamento aplicado internamente de numero_rps, serie_rps e lote para essa requisição.
4. Informar identificador interno de correlação da Focus para esse envio (além do X-Request-Id).

Atenciosamente.


// Script para extrair XMLs das notas travadas em "processando_autorizacao"
// A prefeitura pediu o XML enviado e o retorno de erro.

const refs = [
    'NFT_1772111206527',  // RPS 4 - primeira nota travada
    'NFT_1772116600559',  // RPS 1 - tentativa forçada
    'NFT_1772148130794',  // última tentativa com dados reais
];

async function fetchXmlForRef(ref, authHeader) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`REF: ${ref}`);
    console.log('='.repeat(80));

    // 1. Consulta básica
    const baseUrl = `https://homologacao.focusnfe.com.br/v2/nfse/${ref}`;
    const res = await fetch(`${baseUrl}?completa=1`, {
        headers: { 'Authorization': authHeader }
    });
    const data = await res.json();
    console.log('\n--- STATUS DA NOTA ---');
    console.log(JSON.stringify(data, null, 2));

    // 2. Tentar pegar o XML enviado (caminho_xml_nota_fiscal)
    if (data.caminho_xml_nota_fiscal) {
        const xmlUrl = data.caminho_xml_nota_fiscal.startsWith('http')
            ? data.caminho_xml_nota_fiscal
            : `https://homologacao.focusnfe.com.br${data.caminho_xml_nota_fiscal}`;
        console.log('\n--- XML DA NOTA FISCAL ---');
        try {
            const xmlRes = await fetch(xmlUrl, { headers: { 'Authorization': authHeader } });
            const xmlText = await xmlRes.text();
            console.log(xmlText);
        } catch (e) {
            console.log('Erro ao baixar XML:', e.message);
        }
    } else {
        console.log('\n[XML da nota fiscal não disponível ainda (nota em processamento)]');
    }

    // 3. Tentar pegar XML do RPS enviado
    if (data.caminho_xml_carta_correcao || data.url_xml) {
        console.log('\n--- XML ADICIONAL ---');
        console.log(JSON.stringify({ caminho: data.caminho_xml_carta_correcao, url: data.url_xml }, null, 2));
    }

    // 4. Verificar erros retornados
    if (data.erros && data.erros.length > 0) {
        console.log('\n--- ERROS RETORNADOS PELA PREFEITURA ---');
        console.log(JSON.stringify(data.erros, null, 2));
    }

    return data;
}

async function main() {
    const token = process.env.FOCUSNFE_HOM_TOKEN;
    if (!token) {
        console.error('FOCUSNFE_HOM_TOKEN não encontrado!');
        process.exit(1);
    }
    const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');

    console.log('Extraindo XMLs e status das notas travadas...');
    console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

    for (const ref of refs) {
        try {
            await fetchXmlForRef(ref, authHeader);
        } catch (e) {
            console.error(`Erro ao consultar ${ref}:`, e.message);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('FIM DA EXTRAÇÃO');
    console.log('='.repeat(80));
}

main();

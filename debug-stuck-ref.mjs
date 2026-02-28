
async function debugConsulta() {
    const ref = 'NFT_1772116600559';
    const authHeader = 'Basic ' + Buffer.from(process.env.FOCUSNFE_HOM_TOKEN + ':').toString('base64');
    const url = `https://homologacao.focusnfe.com.br/v2/nfse/${ref}?completa=1`;

    console.log(`Consultando REF: ${ref}`);
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });
        const data = await res.json();
        console.log('Status Code:', res.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro na consulta:', e);
    }
}

debugConsulta();

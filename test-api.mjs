// Quick test script to debug Nuvem Fiscal API registration


const HOM_CLIENT_ID = process.env.NUVEMFISCAL_HOM_CLIENT_ID;
const HOM_CLIENT_SECRET = process.env.NUVEMFISCAL_HOM_CLIENT_SECRET;
const HOM_URL = (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br").replace(/\/+$/, '');

const PROD_CLIENT_ID = process.env.NUVEMFISCAL_PROD_CLIENT_ID;
const PROD_CLIENT_SECRET = process.env.NUVEMFISCAL_PROD_CLIENT_SECRET;
const PROD_URL = (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br").replace(/\/+$/, '');

async function getToken(env) {
    const clientId = env === 'production' ? PROD_CLIENT_ID : HOM_CLIENT_ID;
    const clientSecret = env === 'production' ? PROD_CLIENT_SECRET : HOM_CLIENT_SECRET;

    console.log(`\n🔑 Getting token for ${env}...`);
    console.log(`   Client ID: ${clientId?.substring(0, 6)}...`);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'empresa nfce nfe nfse');

    const res = await fetch("https://auth.nuvemfiscal.com.br/oauth/token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`   ❌ Auth error (${res.status}):`, errorText);
        return null;
    }

    const data = await res.json();
    console.log(`   ✅ Token obtained!`);
    return data.access_token;
}

async function registerCompany(env) {
    const baseUrl = env === 'production' ? PROD_URL : HOM_URL;
    const token = await getToken(env);
    if (!token) return;

    const payload = {
        cpf_cnpj: "13167722000187",
        nome_razao_social: "AMPLOTEC CONTABILIDADE LTDA.",
        nome_fantasia: "AMPLOTEC CONTABILIDADE",
        email: "contabil@amplotec.com.br",
        inscricao_estadual: "",
        inscricao_municipal: "972184",
        endereco: {
            logradouro: "RUA BARAO DO RIO BRANCO",
            numero: "1587",
            complemento: "SALA 09",
            bairro: "CENTRO",
            codigo_municipio: "4127700",
            cidade: "Toledo",
            uf: "PR",
            cep: "85900005",
            pais: "BRASIL"
        }
    };

    console.log(`\n📦 Registering company in ${env} at ${baseUrl}/empresas`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    // Try POST first
    let res = await fetch(`${baseUrl}/empresas`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    console.log(`   POST /empresas -> ${res.status} ${res.statusText}`);

    if (!res.ok) {
        const body = await res.text();
        console.log(`   Response body:`, body);

        if (res.status === 409 || res.status === 400) {
            console.log(`   ↪ Company exists, trying PUT...`);
            res = await fetch(`${baseUrl}/empresas/13167722000187`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            console.log(`   PUT /empresas/13167722000187 -> ${res.status} ${res.statusText}`);
            const putBody = await res.text();
            console.log(`   Response body:`, putBody);
        }
    } else {
        const body = await res.text();
        console.log(`   ✅ Success! Response:`, body);
    }

    // Check if the company exists now
    console.log(`\n🔍 Checking company exists: GET ${baseUrl}/empresas/13167722000187`);
    const checkRes = await fetch(`${baseUrl}/empresas/13167722000187`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`   GET -> ${checkRes.status} ${checkRes.statusText}`);
    const checkBody = await checkRes.text();
    console.log(`   Response:`, checkBody.substring(0, 500));
}

async function main() {
    console.log("=== NUVEM FISCAL API TEST ===");
    console.log(`HOM URL: ${HOM_URL}`);
    console.log(`PROD URL: ${PROD_URL}`);

    await registerCompany('homologation');
    await registerCompany('production');
}

main().catch(e => console.error("FATAL:", e));

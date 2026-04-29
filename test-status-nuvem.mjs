import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const CLIENT_ID = env.NUVEMFISCAL_HOM_CLIENT_ID;
const CLIENT_SECRET = env.NUVEMFISCAL_HOM_CLIENT_SECRET;
const BASE_URL = env.NUVEMFISCAL_HOM_URL || 'https://api.sandbox.nuvemfiscal.com.br';
const AUTH_URL = 'https://auth.nuvemfiscal.com.br/oauth/token';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Faltam NUVEMFISCAL_HOM_CLIENT_ID e/ou NUVEMFISCAL_HOM_CLIENT_SECRET no .env.local');
  process.exit(1);
}

async function checkStatus() {
  const tokenRes = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'empresa nfse',
    }),
  });

  if (!tokenRes.ok) {
    console.error('Erro ao obter token:', await tokenRes.text());
    process.exit(1);
  }

  const { access_token: token } = await tokenRes.json();
  console.log('Token obtido com sucesso.');

  // Listar últimas notas em homologação
  const res = await fetch(`${BASE_URL}/nfse?$top=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkStatus().catch(console.error);

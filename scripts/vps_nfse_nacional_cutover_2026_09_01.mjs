import fs from "node:fs";

const targetDate = "2026-09-01";
const timeZone = "America/Sao_Paulo";
const baseUrl = "http://127.0.0.1:3001";
const nationalEndpoint = "https://sefin.nfse.gov.br/SefinNacional";
const companies = [
  { name: "Amplotec Contabilidade", cnpj: "13167722000187", expectedProvider: "toledo-equiplano" },
  { name: "C S Pick Transportes", cnpj: "04045296000118", expectedProvider: "toledo-equiplano" },
  { name: "Evavan Tur Transportes", cnpj: "04520123000104", expectedProvider: "toledo-equiplano" },
  { name: "Kabroski Automotiva", cnpj: "10894359000103", expectedProvider: "toledo-equiplano" },
  { name: "NHT Centro Automotivo", cnpj: "35181069000143", expectedProvider: "guaira-ipm" },
  { name: "Rally Injeção Eletrônica", cnpj: "68667353000183", expectedProvider: "nfse-nacional" },
];

for (const line of fs.readFileSync("/etc/nuvem-local-fiscal.env", "utf8").split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator > 0) process.env[line.slice(0, separator).trim()] ??= line.slice(separator + 1).trim();
}

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function main() {
  if (saoPauloDate() < targetDate) throw new Error(`Execução bloqueada antes de ${targetDate}.`);
  const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.API_CLIENT_DEFAULT_ID || "", client_secret: process.env.API_CLIENT_DEFAULT_SECRET || "", scope: "empresa nfse" }),
  });
  if (!tokenResponse.ok) throw new Error(`Autenticação local recusada (${tokenResponse.status}).`);
  const token = (await tokenResponse.json()).access_token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const prepared = [];

  for (const company of companies) {
    const response = await fetch(`${baseUrl}/empresas/${company.cnpj}/nfse?ambiente=producao`, { headers });
    if (!response.ok) throw new Error(`${company.name}: consulta recusada (${response.status}).`);
    const config = await response.json();
    if (![company.expectedProvider, "nfse-nacional"].includes(config.provedor) || !config.nacional?.codigo_tributacao_nacional || !config.nacional?.codigo_nbs) {
      throw new Error(`${company.name}: configuração nacional de produção incompleta.`);
    }
    prepared.push({ ...company, config });
  }

  for (const company of prepared) {
    const response = await fetch(`${baseUrl}/empresas/${company.cnpj}/nfse`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ambiente: "producao", provedor: "nfse-nacional", nacional: { ...company.config.nacional, endpoint: nationalEndpoint } }),
    });
    if (!response.ok) throw new Error(`${company.name}: ativação recusada (${response.status}).`);
    const check = await fetch(`${baseUrl}/empresas/${company.cnpj}/nfse?ambiente=producao`, { headers });
    const config = check.ok ? await check.json() : null;
    if (!check.ok || config?.provedor !== "nfse-nacional" || config?.nacional?.endpoint !== nationalEndpoint) throw new Error(`${company.name}: ativação não confirmada.`);
    console.log(`${company.name}: NFS-e Nacional ativada e confirmada.`);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

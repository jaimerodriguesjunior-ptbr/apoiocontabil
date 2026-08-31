import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const targetDate = "2026-09-01";
const timeZone = "America/Sao_Paulo";
const nationalProductionEndpoint = "https://sefin.nfse.gov.br/SefinNacional";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};

for (const line of fs.readFileSync(path.join(rootDir, ".env.local"), "utf8").split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator > 0) env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
}

const companies = [
  { organizationId: "70c1428a-25a3-4283-ad1e-833947fa0f1b", name: "Amplotec Contabilidade", expectedProvider: "toledo-equiplano" },
  { organizationId: "8e6cfd49-22f3-4802-a8ae-aa7841d01e15", name: "C S Pick Transportes", expectedProvider: "toledo-equiplano" },
  { organizationId: "7cc29313-73a0-42c6-b185-81dab278850b", name: "Evavan Tur Transportes", expectedProvider: "toledo-equiplano" },
];

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function getToken(baseUrl) {
  const response = await fetch(env.NUVEMFISCAL_PROD_AUTH_URL || `${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.NUVEMFISCAL_PROD_CLIENT_ID || "",
      client_secret: env.NUVEMFISCAL_PROD_CLIENT_SECRET || "",
      scope: "empresa nfse",
    }),
  });
  if (!response.ok) throw new Error(`Autenticação no emissor falhou (${response.status}).`);
  return (await response.json()).access_token;
}

async function getNfseConfig(baseUrl, token, cnpj) {
  const response = await fetch(`${baseUrl}/empresas/${cnpj}/nfse?ambiente=producao`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Consulta da configuração NFS-e falhou (${response.status}).`);
  return response.json();
}

async function main() {
  if (saoPauloDate() < targetDate) throw new Error(`Execução bloqueada antes de ${targetDate} (${timeZone}).`);

  const baseUrl = String(env.NUVEMFISCAL_PROD_URL || "").replace(/\/+$/, "");
  if (!baseUrl || !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Variáveis de produção incompletas.");

  const token = await getToken(baseUrl);
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from("company_settings").select("organization_id, cnpj, cpf_cnpj").in("organization_id", companies.map((company) => company.organizationId));
  if (error) throw error;

  const records = new Map((data || []).map((record) => [record.organization_id, record]));
  const prepared = [];
  for (const company of companies) {
    const record = records.get(company.organizationId);
    const cnpj = String(record?.cnpj || record?.cpf_cnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) throw new Error(`${company.name}: CNPJ ausente ou inválido.`);

    const config = await getNfseConfig(baseUrl, token, cnpj);
    const provider = String(config?.provedor || "");
    if (![company.expectedProvider, "nfse-nacional"].includes(provider)) throw new Error(`${company.name}: provedor inesperado (${provider || "vazio"}).`);
    if (!config?.nacional?.codigo_tributacao_nacional || !config?.nacional?.codigo_nbs || !config?.nacional?.versao_leiaute) {
      throw new Error(`${company.name}: configuração nacional de produção incompleta.`);
    }
    prepared.push({ ...company, cnpj, provider, nacional: config.nacional });
  }

  for (const company of prepared) {
    if (company.provider !== "nfse-nacional") {
      const response = await fetch(`${baseUrl}/empresas/${company.cnpj}/nfse`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        // The local emitter stores the endpoint shared with the municipal adapter.
        // Set it only at the cutover, preserving the already-prepared DPS sequence
        // and national tax parameters.
        body: JSON.stringify({
          ambiente: "producao",
          provedor: "nfse-nacional",
          nacional: { ...company.nacional, endpoint: nationalProductionEndpoint },
        }),
      });
      if (!response.ok) throw new Error(`${company.name}: ativação do emissor nacional recusada (${response.status}).`);
    }

    const check = await getNfseConfig(baseUrl, token, company.cnpj);
    if (check?.provedor !== "nfse-nacional" || check?.nacional?.endpoint !== nationalProductionEndpoint) {
      throw new Error(`${company.name}: ativação não confirmada.`);
    }

    const { error: updateError } = await supabase
      .from("company_settings")
      .update({ nfse_provider: "nfse-nacional", nfce_sync_status: "success", nfce_sync_message: null, nfce_last_sync_at: new Date().toISOString() })
      .eq("organization_id", company.organizationId);
    if (updateError) throw new Error(`${company.name}: emissor ativado, mas o cadastro local não foi atualizado (${updateError.message}).`);
    console.log(`${company.name}: NFS-e Nacional ativada e confirmada.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

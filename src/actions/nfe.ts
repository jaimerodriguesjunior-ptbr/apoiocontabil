"use server";

import { revalidatePath } from "next/cache";
import { requireFiscalModule } from "@/lib/auth-context";
import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";

type NFeVendaItemInput = {
  catalogItemId: string;
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
};

type NFeVendaDraftInput = { clientId: string; items: NFeVendaItemInput[] };
type StoredItem = { codigo: string; descricao: string; ncm: string; cfop: string; unidade: string; quantidade: number; valor_unitario: number; valor_total: number };
type NFeReturnOriginItem = StoredItem & { origem: number; vBC: number; pICMS: number; vICMS: number; modBC: number };
type NFeReturnInput = { originInvoiceId: string; items: Array<{ codigo: string; quantidade: number }> };

const money = (value: number) => Number(Number(value || 0).toFixed(2));
const digits = (value?: string | null) => String(value || "").replace(/\D/g, "");
// Excecao temporaria para a Mineracao Linha Bandeirantes, conforme orientacao fiscal.
const MINERADORA_CFOP_5101_CNPJ = "13107823000162";
// Mantido equivalente ao sanitizador fiscal da Autoeletrica para que os dois clientes
// enviem texto compativel com o mesmo contrato da Nuvem Local Fiscal.
const fiscalText = (value: unknown, max = 60) => String(value || "")
  .normalize("NFC")
  .replace(/[\u0000-\u001F\u007F]/g, " ")
  .replace(/[\u00A0\u2000-\u200D\u202F\u205F\u3000]/g, " ")
  .replace(/[‘’‚‛`´]/g, "'")
  .replace(/[“”„‟]/g, '"')
  .replace(/[–—−]/g, "-")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max)
  .trim();

function saoPauloDateTime() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}-03:00`;
}

function validBrazilianDocument(value?: string | null) {
  const document = digits(value);
  if (![11, 14].includes(document.length) || /^(\d)\1+$/.test(document)) return false;
  const calculate = (base: string, weights: number[]) => {
    const total = base.split("").reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  if (document.length === 11) {
    const first = calculate(document.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculate(document.slice(0, 9) + first, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return document === `${document.slice(0, 9)}${first}${second}`;
  }
  const first = calculate(document.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculate(document.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return document === `${document.slice(0, 12)}${first}${second}`;
}

function buildInfRespTec(environment: "production" | "homologation") {
  const production = environment === "production";
  const cnpj = digits(process.env.NFE_RT_CNPJ);
  const contact = fiscalText(process.env.NFE_RT_CONTATO);
  const email = fiscalText(process.env.NFE_RT_EMAIL, 60);
  const phone = digits(process.env.NFE_RT_FONE);
  const idCSRT = digits(production ? process.env.NFE_CSRT_ID_PRODUCTION : process.env.NFE_CSRT_ID_HOMOLOGATION);
  const CSRT = production ? process.env.NFE_CSRT_TOKEN_PRODUCTION : process.env.NFE_CSRT_TOKEN_HOMOLOGATION;
  return { CNPJ: cnpj, xContato: contact, email, fone: phone, ...(idCSRT && CSRT ? { idCSRT: Number(idCSRT), CSRT } : {}) };
}

function validateResponsibleTechnical(environment: "production" | "homologation") {
  const cnpj = digits(process.env.NFE_RT_CNPJ);
  if (!validBrazilianDocument(cnpj) || cnpj.length !== 14) return "Configure NFE_RT_CNPJ valido no .env.local do Apoio Contabil.";
  if (!fiscalText(process.env.NFE_RT_CONTATO) || !fiscalText(process.env.NFE_RT_EMAIL) || !digits(process.env.NFE_RT_FONE)) return "Configure NFE_RT_CONTATO, NFE_RT_EMAIL e NFE_RT_FONE no .env.local do Apoio Contabil.";
  const idCSRT = digits(environment === "production" ? process.env.NFE_CSRT_ID_PRODUCTION : process.env.NFE_CSRT_ID_HOMOLOGATION);
  const tokenCSRT = environment === "production" ? process.env.NFE_CSRT_TOKEN_PRODUCTION : process.env.NFE_CSRT_TOKEN_HOMOLOGATION;
  if (Boolean(idCSRT) !== Boolean(tokenCSRT)) return "Configure juntos o ID e o token CSRT do ambiente fiscal, ou remova ambos.";
  return null;
}

function buildRtcHomologationItem(baseValue: number) {
  const vBC = money(baseValue);
  const vIBSUF = money(vBC * 0.1 / 100);
  const vIBSMun = 0;
  const vCBS = money(vBC * 0.9 / 100);
  return { IBSCBS: { CST: "000", cClassTrib: "000001", gIBSCBS: { vBC, gIBSUF: { pIBSUF: "0.10", vIBSUF }, gIBSMun: { pIBSMun: "0", vIBSMun }, vIBS: money(vIBSUF + vIBSMun), gCBS: { pCBS: "0.90", vCBS } } } };
}

function buildRtcHomologationTotal(baseValue: number) {
  const vBCIBSCBS = money(baseValue);
  const vIBSUF = money(vBCIBSCBS * 0.1 / 100);
  const vIBSMun = 0;
  const vCBS = money(vBCIBSCBS * 0.9 / 100);
  return { IBSCBSTot: { vBCIBSCBS, gIBS: { gIBSUF: { vDif: 0, vDevTrib: 0, vIBSUF }, gIBSMun: { vDif: 0, vDevTrib: 0, vIBSMun }, vIBS: money(vIBSUF + vIBSMun), vCredPres: 0, vCredPresCondSus: 0 }, gCBS: { vDif: 0, vDevTrib: 0, vCBS, vCredPres: 0, vCredPresCondSus: 0 } } };
}

const xmlTag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1]?.trim() || "";
const xmlSection = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] || "";
const decodeXml = (value: string) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function parseNFeReturnOrigin(xml: string) {
  const emit = xmlSection(xml, "emit");
  const address = xmlSection(emit, "enderEmit");
  const items: NFeReturnOriginItem[] = [];
  for (const match of xml.matchAll(/<det\b[^>]*>([\s\S]*?)<\/det>/gi)) {
    const det = match[1];
    const prod = xmlSection(det, "prod");
    const icms = xmlSection(xmlSection(det, "imposto"), "ICMS");
    const taxGroup = icms.match(/<ICMS(?:00|10|20|30|40|41|50|51|60|70|90)|<ICMSSN(?:101|102|103|201|202|300|400|500|900)/i)?.[0] || "";
    const taxName = taxGroup.replace(/^</, "");
    const tax = taxName ? xmlSection(icms, taxName) : "";
    const quantidade = Number(xmlTag(prod, "qCom").replace(",", "."));
    const valorUnitario = Number(xmlTag(prod, "vUnCom").replace(",", "."));
    const valorTotal = Number(xmlTag(prod, "vProd").replace(",", "."));
    const codigo = xmlTag(prod, "cProd");
    if (!codigo || !Number.isFinite(quantidade) || quantidade <= 0) continue;
    items.push({
      codigo,
      descricao: decodeXml(xmlTag(prod, "xProd")),
      ncm: digits(xmlTag(prod, "NCM")),
      cfop: digits(xmlTag(prod, "CFOP")),
      unidade: xmlTag(prod, "uCom") || "UN",
      quantidade,
      valor_unitario: money(valorUnitario),
      valor_total: money(valorTotal),
      origem: Number(xmlTag(tax, "orig") || 0),
      vBC: money(Number(xmlTag(tax, "vBC").replace(",", "."))),
      pICMS: money(Number(xmlTag(tax, "pICMS").replace(",", "."))),
      vICMS: money(Number(xmlTag(tax, "vICMS").replace(",", "."))),
      modBC: Number(xmlTag(tax, "modBC") || 3),
    });
  }
  return {
    emitente: {
      nome: decodeXml(xmlTag(emit, "xNome")),
      documento: digits(xmlTag(emit, "CNPJ") || xmlTag(emit, "CPF")),
      inscricao_estadual: digits(xmlTag(emit, "IE")),
      logradouro: decodeXml(xmlTag(address, "xLgr")), numero: xmlTag(address, "nro"), complemento: decodeXml(xmlTag(address, "xCpl")),
      bairro: decodeXml(xmlTag(address, "xBairro")), cidade: decodeXml(xmlTag(address, "xMun")), uf: xmlTag(address, "UF").toUpperCase(),
      cep: digits(xmlTag(address, "CEP")), codigo_municipio_ibge: digits(xmlTag(address, "cMun")),
    },
    items,
  };
}

export async function getNFeReturnOrigin(originInvoiceId: string) {
  const context = await requireFiscalModule("nfe");
  const orgId = context.orgId as string;
  const { data: invoice } = await context.supabase.from("fiscal_invoices").select("id, direction, status, numero, serie, chave_acesso, emitente_nome, emitente_cnpj, valor_total, natureza_operacao").eq("id", originInvoiceId).eq("organization_id", orgId).eq("tipo_documento", "NFe").single();
  if (!invoice || invoice.direction !== "input" || invoice.status !== "authorized") return { error: "Selecione uma NF-e de entrada autorizada para emitir a devolucao." };
  if (!/^\d{44}$/.test(digits(invoice.chave_acesso))) return { error: "A NF-e de entrada nao possui chave de acesso valida." };
  const { data: queue } = await context.supabase.from("nfe_import_queue").select("xml_content").eq("organization_id", orgId).eq("chave_acesso", invoice.chave_acesso).eq("status", "imported").maybeSingle();
  if (!queue?.xml_content) return { error: "O XML da NF-e de entrada nao esta disponivel para montar a devolucao." };
  const parsed = parseNFeReturnOrigin(queue.xml_content);
  if (!parsed.emitente.documento || !parsed.items.length) return { error: "Nao foi possivel ler emitente e itens no XML de origem." };
  return { success: true, origin: invoice, supplier: parsed.emitente, items: parsed.items };
}

export async function emitNFeReturn(input: NFeReturnInput) {
  const context = await requireFiscalModule("nfe");
  const orgId = context.orgId as string;
  const originResult = await getNFeReturnOrigin(input.originInvoiceId);
  if (!originResult.success || !originResult.origin || !originResult.supplier || !originResult.items) return { error: originResult.error || "NF-e de origem indisponivel." };
  const selected = input.items.map((selection) => ({ source: originResult.items!.find((item) => item.codigo === selection.codigo), quantidade: Number(selection.quantidade) })).filter((item): item is { source: NFeReturnOriginItem; quantidade: number } => Boolean(item.source));
  if (!selected.length) return { error: "Selecione ao menos um item para devolver." };
  for (const item of selected) {
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0 || item.quantidade > item.source.quantidade) return { error: `Quantidade invalida para ${item.source.descricao}.` };
  }
  const { data: previousReturns } = await context.supabase.from("fiscal_invoices").select("payload_json, status").eq("organization_id", orgId).eq("referenced_invoice_id", originResult.origin.id).eq("tipo_documento", "NFe");
  const alreadyReturned = new Map<string, number>();
  for (const previous of previousReturns || []) {
    if (["error", "cancelled"].includes(String(previous.status || ""))) continue;
    const details = (previous.payload_json as { infNFe?: { det?: Array<{ prod?: { cProd?: string; qCom?: number } }> } } | null)?.infNFe?.det || [];
    for (const detail of details) {
      const code = String(detail.prod?.cProd || "");
      alreadyReturned.set(code, (alreadyReturned.get(code) || 0) + Number(detail.prod?.qCom || 0));
    }
  }
  for (const item of selected) {
    if ((alreadyReturned.get(item.source.codigo) || 0) + item.quantidade > item.source.quantidade) return { error: `A quantidade de ${item.source.descricao} ultrapassa o saldo disponivel para devolucao.` };
  }
  const { data: company } = await context.supabase.from("company_settings").select("*").eq("organization_id", orgId).single();
  if (!company) return { error: "Dados do emitente nao encontrados." };
  const environment = company.environment === "production" ? "production" as const : "homologation" as const;
  if (!validBrazilianDocument(company.cnpj) || digits(company.cnpj).length !== 14 || !digits(company.inscricao_estadual) || !company.logradouro || !company.numero || !company.bairro || !company.cidade || !company.uf || !/^\d{7}$/.test(digits(company.codigo_municipio_ibge)) || !/^\d{8}$/.test(digits(company.cep))) return { error: "Revise os dados fiscais e endereco do emitente antes de emitir a devolucao." };
  const responsibleTechnicalError = validateResponsibleTechnical(environment);
  if (responsibleTechnicalError) return { error: responsibleTechnicalError };
  const supplier = originResult.supplier;
  if (!validBrazilianDocument(supplier.documento) || !supplier.logradouro || !supplier.numero || !supplier.bairro || !supplier.cidade || !supplier.uf || !/^\d{7}$/.test(supplier.codigo_municipio_ibge) || !/^\d{8}$/.test(supplier.cep)) return { error: "O XML de origem nao possui endereco fiscal completo do fornecedor." };
  const sameState = supplier.uf === String(company.uf).toUpperCase();
  const cfop = sameState ? "5202" : "6202";
  const serie = Number(company.nfe_serie || 1);
  if (!Number.isInteger(serie) || serie < 1 || serie > 999) return { error: "A serie da NF-e deve ser um numero entre 1 e 999." };
  const { data: reservedNumber, error: numberError } = await context.supabase.rpc("get_next_nfe_number", { p_org_id: orgId, p_serie: serie, p_environment: environment });
  if (numberError || !reservedNumber) return { error: "Numeracao NF-e indisponivel." };
  const number = Number(reservedNumber);
  const address = (entity: Record<string, unknown>) => ({ xLgr: fiscalText(entity.logradouro), nro: fiscalText(entity.numero), xCpl: fiscalText(entity.complemento) || undefined, xBairro: fiscalText(entity.bairro), cMun: Number(entity.codigo_municipio_ibge), xMun: fiscalText(entity.cidade), UF: fiscalText(entity.uf, 2).toUpperCase(), CEP: digits(entity.cep as string), cPais: "1058", xPais: "BRASIL" });
  const items = selected.map(({ source, quantidade }, index) => {
    const factor = quantidade / source.quantidade;
    const valorTotal = money(source.valor_total * factor);
    const vBC = money(source.vBC * factor);
    const vICMS = money(source.vICMS * factor);
    return { source, quantidade, valorTotal, vBC, vICMS, det: { nItem: index + 1, prod: { cProd: source.codigo || String(index + 1), cEAN: "SEM GTIN", xProd: fiscalText(source.descricao, 120), NCM: source.ncm, CFOP: cfop, uCom: source.unidade, qCom: quantidade, vUnCom: money(source.valor_unitario), vProd: valorTotal, cEANTrib: "SEM GTIN", uTrib: source.unidade, qTrib: quantidade, vUnTrib: money(source.valor_unitario), indTot: 1 }, imposto: { ICMS: { ICMSSN900: { orig: source.origem, CSOSN: "900", modBC: source.modBC || 3, vBC, pICMS: source.pICMS, vICMS } }, PIS: { PISOutr: { CST: "99", vBC: 0, pPIS: 0, vPIS: 0 } }, COFINS: { COFINSOutr: { CST: "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 } }, IBSCBS: buildRtcHomologationItem(valorTotal).IBSCBS } } };
  });
  const total = money(items.reduce((sum, item) => sum + item.valorTotal, 0));
  const totalVBC = money(items.reduce((sum, item) => sum + item.vBC, 0));
  const totalVICMS = money(items.reduce((sum, item) => sum + item.vICMS, 0));
  const originKey = digits(originResult.origin.chave_acesso);
  const payload = { ambiente: environment === "production" ? "producao" : "homologacao", metadados: { devolucao: { finalidadeCompra: "revenda", itens: items.map((item, index) => ({ nItem: index + 1, cProd: item.source.codigo, cfopOrigem: item.source.cfop })) } }, infNFe: { versao: "4.00", ide: { cUF: Number(String(company.codigo_municipio_ibge).slice(0, 2)), natOp: "DEVOLUCAO DE MERCADORIA", mod: 55, serie, nNF: number, dhEmi: saoPauloDateTime(), tpNF: 1, idDest: sameState ? 1 : 2, cMunFG: Number(company.codigo_municipio_ibge), cMunFGIBS: Number(company.codigo_municipio_ibge), tpImp: 1, tpEmis: 1, tpAmb: environment === "production" ? 1 : 2, finNFe: 4, indFinal: 0, indPres: 9, procEmi: 0, verProc: "ApoioContabil 1.0", NFref: [{ refNFe: originKey }] }, emit: { CNPJ: digits(company.cnpj), xNome: fiscalText(company.razao_social), xFant: fiscalText(company.nome_fantasia) || undefined, enderEmit: address(company), IE: digits(company.inscricao_estadual), CRT: 1 }, dest: { ...(supplier.documento.length === 14 ? { CNPJ: supplier.documento } : { CPF: supplier.documento }), xNome: fiscalText(supplier.nome), enderDest: address(supplier), indIEDest: supplier.inscricao_estadual ? 1 : 9, ...(supplier.inscricao_estadual ? { IE: supplier.inscricao_estadual } : {}) }, det: items.map((item) => item.det), total: { ICMSTot: { vBC: totalVBC, vICMS: totalVICMS, vICMSDeson: 0, vFCP: 0, vBCST: 0, vST: 0, vFCPST: 0, vFCPSTRet: 0, vProd: total, vFrete: 0, vSeg: 0, vDesc: 0, vII: 0, vIPI: 0, vIPIDevol: 0, vPIS: 0, vCOFINS: 0, vOutro: 0, vNF: total }, ...buildRtcHomologationTotal(total) }, transp: { modFrete: 9 }, pag: { detPag: [{ tPag: "90", vPag: 0 }] }, infAdic: { infCpl: `DEVOLUCAO REFERENTE A NF-e ${originResult.origin.numero || ""}, CHAVE ${originKey}.` }, infRespTec: buildInfRespTec(environment) } };
  const baseUrl = ((environment === "production" ? process.env.NUVEMFISCAL_PROD_URL : process.env.NUVEMFISCAL_HOM_URL) || "").replace(/\/+$/, "");
  if (!baseUrl) return { error: "URL da Nuvem Local Fiscal nao configurada." };
  const mesReferencia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());
  const { data: invoice, error: invoiceError } = await context.supabase.from("fiscal_invoices").insert({ organization_id: orgId, direction: "output", status: "processing", environment, numero: String(number), serie: String(serie), valor_total: total, data_emissao: new Date().toISOString(), mes_referencia: mesReferencia, natureza_operacao: "DEVOLUCAO DE MERCADORIA", finalidade_nfe: 4, referenced_invoice_id: originResult.origin.id, referenced_key: originKey, emitente_nome: company.razao_social, emitente_cnpj: digits(company.cnpj), destinatario_nome: supplier.nome, destinatario_cnpj: supplier.documento, payload_json: payload }).select("id").single();
  if (invoiceError || !invoice) return { error: invoiceError?.message || "Nao foi possivel salvar a devolucao." };
  try {
    const token = await getNuvemFiscalToken(environment);
    const response = await fetch(`${baseUrl}/nfe`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
    const result = await response.json() as { id?: string; message?: string; error?: { message?: string } };
    if (!response.ok || !result.id) throw new Error(result.error?.message || result.message || `Falha no emissor local (${response.status}).`);
    await context.supabase.from("fiscal_invoices").update({ nuvemfiscal_uuid: result.id, updated_at: new Date().toISOString() }).eq("id", invoice.id);
    revalidatePath("/notas");
    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao conectar a Nuvem Local Fiscal.";
    await context.supabase.from("fiscal_invoices").update({ status: "error", error_message: message, updated_at: new Date().toISOString() }).eq("id", invoice.id);
    revalidatePath("/notas");
    return { error: message };
  }
}

export async function saveNFeVendaDraft(input: NFeVendaDraftInput) {
  const context = await requireFiscalModule("nfe");
  const orgId = context.orgId as string;
  if (!input.clientId) return { error: "Selecione o destinatario." };
  if (!input.items.length) return { error: "Adicione ao menos um produto a nota." };

  const { data: company, error: companyError } = await context.supabase
    .from("company_settings")
    .select("cnpj, razao_social, nome_fantasia, inscricao_estadual, logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio_ibge, nfe_serie, regime_tributario, environment")
    .eq("organization_id", orgId).single();
  if (companyError || !company) return { error: "Complete os dados fiscais da empresa antes de emitir NF-e." };
  if (!validBrazilianDocument(company.cnpj) || digits(company.cnpj).length !== 14) return { error: "Informe um CNPJ valido da empresa para emitir NF-e." };
  if (String(company.regime_tributario || "1") !== "1") return { error: "Nesta fase, a emissao de NF-e atende somente empresas do Simples Nacional." };
  if (!digits(company.inscricao_estadual)) return { error: "Informe a inscricao estadual da empresa para emitir NF-e." };
  if (!fiscalText(company.razao_social) || !company.logradouro || !company.numero || !company.bairro || !company.cidade || !company.uf || !company.cep || !company.codigo_municipio_ibge) return { error: "Complete razao social e endereco do emitente antes de emitir NF-e." };
  if (!/^\d{7}$/.test(digits(company.codigo_municipio_ibge)) || !/^\d{8}$/.test(digits(company.cep))) return { error: "Revise o codigo IBGE e o CEP do emitente antes de emitir NF-e." };

  const { data: client, error: clientError } = await context.supabase
    .from("clients")
    .select("id, nome, cpf_cnpj, email, inscricao_estadual, ind_ie_dest, logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio_ibge")
    .eq("id", input.clientId).eq("organization_id", orgId).single();
  if (clientError || !client) return { error: "Destinatario nao encontrado." };
  if (!validBrazilianDocument(client.cpf_cnpj)) return { error: "O destinatario precisa ter CPF ou CNPJ valido." };
  if (!client.logradouro || !client.numero || !client.bairro || !client.cidade || !client.uf || !client.cep || !client.codigo_municipio_ibge) return { error: "Complete o endereco do destinatario antes de emitir NF-e." };
  if (!fiscalText(client.nome) || !/^\d{7}$/.test(digits(client.codigo_municipio_ibge)) || !/^\d{8}$/.test(digits(client.cep))) return { error: "Revise nome, codigo IBGE e CEP do destinatario antes de emitir NF-e." };

  const invalidItem = input.items.find((item) => {
    const quantidade = Number(item.quantidade);
    const valorUnitario = money(item.valorUnitario);
    const ncm = digits(item.ncm);
    return !item.descricao.trim() || !Number.isFinite(quantidade) || !Number.isFinite(valorUnitario) || quantidade <= 0 || valorUnitario <= 0 || ncm.length !== 8 || ncm === "00000000";
  });
  if (invalidItem) return { error: `Revise ${invalidItem.descricao || "o produto"}: descricao, quantidade, valor e NCM valido sao obrigatorios.` };

  const environment = company.environment === "production" ? "production" : "homologation";
  const sameState = String(client.uf).toUpperCase() === String(company.uf).toUpperCase();
  const saleCfop = digits(company.cnpj) === MINERADORA_CFOP_5101_CNPJ
    ? "5101"
    : sameState ? "5102" : "6102";
  const items = input.items.map((item, index) => {
    const quantidade = Number(item.quantidade);
    const valorUnitario = money(item.valorUnitario);
    const valorTotal = money(quantidade * valorUnitario);
    return { nItem: index + 1, catalog_item_id: item.catalogItemId, codigo: item.codigo || String(index + 1), descricao: item.descricao.trim(), ncm: digits(item.ncm), cfop: saleCfop, unidade: item.unidade.trim().toUpperCase() || "UN", quantidade, valor_unitario: valorUnitario, valor_total: valorTotal };
  });
  const valorTotal = money(items.reduce((total, item) => total + item.valor_total, 0));
  const payload = { version: 1, type: "sale", environment, natureza_operacao: "VENDA DE MERCADORIA", finalidade_nfe: 1, id_dest: sameState ? 1 : 2, company: { cnpj: digits(company.cnpj), razao_social: company.razao_social, serie: company.nfe_serie || 1 }, destinatario: client, items, totals: { valor_produtos: valorTotal, valor_nota: valorTotal } };
  const mesReferencia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());
  const { data: invoice, error: invoiceError } = await context.supabase.from("fiscal_invoices").insert({ organization_id: orgId, client_id: client.id, tipo_documento: "NFe", direction: "output", status: "draft", environment, valor_total: valorTotal, data_emissao: new Date().toISOString(), mes_referencia: mesReferencia, natureza_operacao: "VENDA DE MERCADORIA", finalidade_nfe: 1, emitente_nome: company.razao_social, emitente_cnpj: digits(company.cnpj), destinatario_nome: client.nome, destinatario_cnpj: digits(client.cpf_cnpj), payload_json: payload }).select("id").single();
  if (invoiceError || !invoice) return { error: invoiceError?.message || "Nao foi possivel salvar o rascunho." };
  revalidatePath("/notas");
  return { success: true, invoiceId: invoice.id };
}

export async function sendNFeVendaDraft(invoiceId: string) {
  const context = await requireFiscalModule("nfe");
  const orgId = context.orgId as string;
  const { data: invoice } = await context.supabase.from("fiscal_invoices").select("id, client_id, payload_json, status, numero, serie, environment").eq("id", invoiceId).eq("organization_id", orgId).eq("tipo_documento", "NFe").single();
  if (!invoice || invoice.status !== "draft") return { error: "Rascunho de NF-e nao encontrado ou ja enviado." };
  const items = ((invoice.payload_json as { items?: StoredItem[] } | null)?.items || []);
  if (!invoice.client_id || !items.length) return { error: "Rascunho sem destinatario ou itens." };
  if (items.some((item) => !Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0 || !Number.isFinite(Number(item.valor_unitario)) || Number(item.valor_unitario) <= 0)) return { error: "Rascunho invalido: quantidade e valor unitario devem ser maiores que zero." };
  const [{ data: company }, { data: client }] = await Promise.all([
    context.supabase.from("company_settings").select("*").eq("organization_id", orgId).single(),
    context.supabase.from("clients").select("*").eq("id", invoice.client_id).eq("organization_id", orgId).single(),
  ]);
  if (!company || !client) return { error: "Nao foi possivel carregar emitente ou destinatario." };

  const environment = invoice.environment === "production" ? "production" as const : "homologation" as const;
  if (!validBrazilianDocument(company.cnpj) || digits(company.cnpj).length !== 14 || !fiscalText(company.razao_social)) return { error: "Revise CNPJ e razao social do emitente antes de enviar a NF-e." };
  if (!digits(company.inscricao_estadual) || !company.logradouro || !company.numero || !company.bairro || !company.cidade || !company.uf || !/^\d{7}$/.test(digits(company.codigo_municipio_ibge)) || !/^\d{8}$/.test(digits(company.cep))) return { error: "Revise o endereco fiscal, IE, codigo IBGE e CEP do emitente antes de enviar a NF-e." };
  if (!validBrazilianDocument(client.cpf_cnpj) || !fiscalText(client.nome) || !client.logradouro || !client.numero || !client.bairro || !client.cidade || !client.uf || !/^\d{7}$/.test(digits(client.codigo_municipio_ibge)) || !/^\d{8}$/.test(digits(client.cep))) return { error: "Revise documento e endereco completo do destinatario antes de enviar a NF-e." };
  const responsibleTechnicalError = validateResponsibleTechnical(environment);
  if (responsibleTechnicalError) return { error: responsibleTechnicalError };

  const serie = Number(invoice.serie || company.nfe_serie || 1);
  if (!Number.isInteger(serie) || serie < 1 || serie > 999) return { error: "A serie da NF-e deve ser um numero entre 1 e 999." };
  let number = Number(invoice.numero || 0);
  if (!number) {
    const { data: reservedNumber, error: numberError } = await context.supabase.rpc("get_next_nfe_number", { p_org_id: orgId, p_serie: serie, p_environment: environment });
    if (numberError || !reservedNumber) return { error: "Numeracao NF-e indisponivel. Execute migration_nfe_sequence_security.sql no Supabase." };
    number = Number(reservedNumber);
  }
  const sameState = String(company.uf || "").toUpperCase() === String(client.uf || "").toUpperCase();
  const forcedSaleCfop = digits(company.cnpj) === MINERADORA_CFOP_5101_CNPJ ? "5101" : null;
  const document = digits(client.cpf_cnpj);
  const clientIe = digits(client.inscricao_estadual);
  const configuredIndIeDest = Number(client.ind_ie_dest);
  const indIEDest = [1, 2, 9].includes(configuredIndIeDest) ? configuredIndIeDest : clientIe ? 1 : 9;
  if (indIEDest === 1 && !clientIe) return { error: "Informe a inscricao estadual do destinatario contribuinte de ICMS." };
  const address = (entity: Record<string, unknown>) => ({
    xLgr: fiscalText(entity.logradouro), nro: fiscalText(entity.numero), xCpl: fiscalText(entity.complemento) || undefined,
    xBairro: fiscalText(entity.bairro), cMun: Number(entity.codigo_municipio_ibge), xMun: fiscalText(entity.cidade),
    UF: fiscalText(entity.uf, 2).toUpperCase(), CEP: digits(entity.cep as string), cPais: "1058", xPais: "BRASIL",
  });
  const total = money(items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0));
  const sendRtc = items.every((item) => ["5101", "5102", "6101", "6102"].includes(forcedSaleCfop || item.cfop));
  const payload = {
    ambiente: environment === "production" ? "producao" : "homologacao",
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: Number(String(company.codigo_municipio_ibge || "").slice(0, 2)), natOp: "VENDA DE MERCADORIA", mod: 55,
        serie, nNF: number, dhEmi: saoPauloDateTime(), tpNF: 1, idDest: sameState ? 1 : 2,
        cMunFG: Number(company.codigo_municipio_ibge), ...(sendRtc ? { cMunFGIBS: Number(company.codigo_municipio_ibge) } : {}),
        tpImp: 1, tpEmis: 1, tpAmb: environment === "production" ? 1 : 2, finNFe: 1, indFinal: 1, indPres: 1, indIntermed: 0, procEmi: 0, verProc: "ApoioContabil 1.0",
      },
      emit: { CNPJ: digits(company.cnpj), xNome: fiscalText(company.razao_social), xFant: fiscalText(company.nome_fantasia) || undefined, enderEmit: address(company), IE: digits(company.inscricao_estadual), CRT: 1 },
      dest: { ...(document.length === 14 ? { CNPJ: document } : { CPF: document }), xNome: fiscalText(client.nome), enderDest: address(client), indIEDest, ...(indIEDest === 1 && clientIe ? { IE: clientIe } : {}), email: fiscalText(client.email) || undefined },
      det: items.map((item, index) => ({
        nItem: index + 1,
        prod: { cProd: item.codigo || String(index + 1), cEAN: "SEM GTIN", xProd: fiscalText(item.descricao, 120), NCM: item.ncm, CFOP: forcedSaleCfop || item.cfop, uCom: item.unidade, qCom: item.quantidade, vUnCom: money(item.valor_unitario), vProd: money(item.valor_total), cEANTrib: "SEM GTIN", uTrib: item.unidade, qTrib: item.quantidade, vUnTrib: money(item.valor_unitario), indTot: 1 },
        imposto: { ICMS: { ICMSSN102: { orig: 0, CSOSN: "102" } }, PIS: { PISOutr: { CST: "99", vBC: 0, pPIS: 0, vPIS: 0 } }, COFINS: { COFINSOutr: { CST: "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 } }, ...(sendRtc ? buildRtcHomologationItem(item.valor_total) : {}) },
      })),
      total: { ICMSTot: { vBC: 0, vICMS: 0, vICMSDeson: 0, vFCP: 0, vBCST: 0, vST: 0, vFCPST: 0, vFCPSTRet: 0, vProd: total, vFrete: 0, vSeg: 0, vDesc: 0, vII: 0, vIPI: 0, vIPIDevol: 0, vPIS: 0, vCOFINS: 0, vOutro: 0, vNF: total }, ...(sendRtc ? buildRtcHomologationTotal(total) : {}) },
      transp: { modFrete: 9 }, pag: { detPag: [{ tPag: "01", vPag: total }] }, infAdic: { infCpl: "VENDA DE MERCADORIA." },
      infRespTec: buildInfRespTec(environment),
    },
  };

  // NUVEMFISCAL_* e getNuvemFiscalToken sao nomes legados; esta chamada usa somente a Nuvem Local Fiscal.
  const baseUrl = ((environment === "production" ? process.env.NUVEMFISCAL_PROD_URL : process.env.NUVEMFISCAL_HOM_URL) || "").replace(/\/+$/, "");
  if (!baseUrl) return { error: `URL da Nuvem Local Fiscal de ${environment === "production" ? "producao" : "homologacao"} nao configurada.` };
  await context.supabase.from("fiscal_invoices").update({ status: "processing", numero: String(number), serie: String(serie), payload_json: payload, error_message: null, updated_at: new Date().toISOString() }).eq("id", invoice.id);

  try {
    const token = await getNuvemFiscalToken(environment);
    const response = await fetch(`${baseUrl}/nfe`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
    const result = await response.json() as { id?: string; message?: string; error?: { message?: string } };
    if (!response.ok || !result.id) throw new Error(result.error?.message || result.message || `Falha no emissor local (${response.status}).`);
    // nuvemfiscal_uuid e nome de coluna legado; armazena o ID retornado pela Nuvem Local Fiscal.
    await context.supabase.from("fiscal_invoices").update({ nuvemfiscal_uuid: result.id, error_message: null, updated_at: new Date().toISOString() }).eq("id", invoice.id);
    revalidatePath("/notas");
    return { success: true, documentId: result.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao conectar a Nuvem Local Fiscal.";
    // Sem resposta confiavel, bloqueamos reenvio automatico: a numeracao deve ser reconciliada antes.
    await context.supabase.from("fiscal_invoices").update({ error_message: `${message} Consulte a Nuvem Local Fiscal antes de qualquer novo envio.`, updated_at: new Date().toISOString() }).eq("id", invoice.id);
    revalidatePath("/notas");
    return { error: message };
  }
}

export async function discardNFeVendaDraft(invoiceId: string) {
  const context = await requireFiscalModule("nfe");
  const { error } = await context.supabase
    .from("fiscal_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("organization_id", context.orgId as string)
    .eq("tipo_documento", "NFe")
    .eq("status", "draft");
  if (error) return { error: "Nao foi possivel reabrir o rascunho." };
  revalidatePath("/notas");
  return { success: true };
}

export async function consultarNFe(invoiceId: string) {
  const context = await requireFiscalModule("nfe");
  const { data: invoice } = await context.supabase.from("fiscal_invoices").select("id, environment, nuvemfiscal_uuid").eq("id", invoiceId).eq("organization_id", context.orgId as string).eq("tipo_documento", "NFe").single();
  if (!invoice) return { success: false, error: "NF-e nao encontrada." };
  if (!invoice.nuvemfiscal_uuid) return { success: true, status: "processing", data: { motivo_status: "Envio pendente de reconciliacao com a Nuvem Local Fiscal." } };

  // Campos e funcao com nomes legados; a consulta e feita exclusivamente na Nuvem Local Fiscal.
  const configuredUrl = invoice.environment === "production" ? process.env.NUVEMFISCAL_PROD_URL : process.env.NUVEMFISCAL_HOM_URL;
  const baseUrl = (configuredUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return { success: false, error: "URL da Nuvem Local Fiscal nao configurada." };
  try {
    const token = await getNuvemFiscalToken(invoice.environment === "production" ? "production" : "homologation");
    const response = await fetch(`${baseUrl}/nfe/${invoice.nuvemfiscal_uuid}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return { success: false, error: String(result.message || "Falha ao consultar a NF-e na Nuvem Local Fiscal.") };
    const localStatus = String(result.status || "processamento");
    const status = localStatus === "autorizado" ? "authorized" : localStatus === "cancelado" ? "cancelled" : ["erro", "rejeitado"].includes(localStatus) ? "error" : "processing";
    const authorization = result.autorizacao as Record<string, unknown> | undefined;
    const detailedReason = String(result.motivo || authorization?.motivo_status || result.message || "NF-e rejeitada.");
    const update: Record<string, unknown> = { status, error_message: status === "error" ? detailedReason : null, updated_at: new Date().toISOString() };
    for (const [field, value] of [["numero", result.numero], ["serie", result.serie], ["chave_acesso", result.chave || authorization?.chave], ["xml_url", result.xml_url], ["pdf_url", result.pdf_url], ["protocol", result.protocolo || authorization?.numero_protocolo]] as Array<[string, unknown]>) {
      if (typeof value === "string" && value.trim()) update[field] = value;
      if (typeof value === "number" && Number.isFinite(value)) update[field] = String(value);
    }
    await context.supabase.from("fiscal_invoices").update(update).eq("id", invoice.id);
    revalidatePath("/notas");
    return { success: true, status, data: result, errorMessage: status === "error" ? detailedReason : null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao consultar a Nuvem Local Fiscal." };
  }
}

export async function cancelarNFe(invoiceId: string, motivo: string) {
  const context = await requireFiscalModule("nfe");
  const cleanMotivo = motivo.trim();
  if (cleanMotivo.length < 15 || cleanMotivo.length > 255) return { success: false, error: "O motivo do cancelamento deve ter entre 15 e 255 caracteres." };
  const { data: invoice } = await context.supabase.from("fiscal_invoices").select("id, environment, nuvemfiscal_uuid, status").eq("id", invoiceId).eq("organization_id", context.orgId as string).eq("tipo_documento", "NFe").single();
  if (!invoice?.nuvemfiscal_uuid || invoice.status !== "authorized") return { success: false, error: "NF-e autorizada nao encontrada para cancelamento." };

  // getNuvemFiscalToken e legado no nome; a requisicao e enviada somente a Nuvem Local Fiscal.
  const configuredUrl = invoice.environment === "production" ? process.env.NUVEMFISCAL_PROD_URL : process.env.NUVEMFISCAL_HOM_URL;
  const baseUrl = (configuredUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return { success: false, error: "URL da Nuvem Local Fiscal nao configurada." };
  try {
    const token = await getNuvemFiscalToken(invoice.environment === "production" ? "production" : "homologation");
    const response = await fetch(`${baseUrl}/nfe/${invoice.nuvemfiscal_uuid}/cancelar`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ motivo: cleanMotivo }), cache: "no-store" });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return { success: false, error: String(result.message || "Falha ao cancelar NF-e na Nuvem Local Fiscal.") };
    await context.supabase.from("fiscal_invoices").update({ status: "cancelled", error_message: null, updated_at: new Date().toISOString() }).eq("id", invoice.id);
    revalidatePath("/notas");
    return { success: true, status: "cancelled" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao cancelar NF-e." };
  }
}

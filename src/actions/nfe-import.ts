"use server";

import { revalidatePath } from "next/cache";
import { requireFiscalModule } from "@/lib/auth-context";

const digits = (value?: string | null) => String(value || "").replace(/\D/g, "");
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1]?.trim() || null;
const section = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1] || "";
const xmlText = (value: string | null) => value?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") || null;

function getAccessKey(xml: string) {
  return tag(xml, "chNFe")?.match(/^\d{44}$/)?.[0] || xml.match(/<infNFe[^>]*\bId=["']NFe(\d{44})["']/i)?.[1] || null;
}

function parseNFe(xml: string, chaveAcesso: string) {
  const ide = section(xml, "ide");
  const emit = section(xml, "emit");
  const dest = section(xml, "dest");
  const total = section(xml, "ICMSTot");
  const cStat = tag(section(xml, "protNFe"), "cStat");
  return {
    numero: tag(ide, "nNF"),
    serie: tag(ide, "serie"),
    dataEmissao: tag(ide, "dhEmi") || tag(ide, "dEmi") || new Date().toISOString(),
    naturezaOperacao: xmlText(tag(ide, "natOp")),
    emitenteNome: xmlText(tag(emit, "xNome")),
    emitenteDocumento: digits(tag(emit, "CNPJ") || tag(emit, "CPF")),
    destinatarioNome: xmlText(tag(dest, "xNome")),
    destinatarioDocumento: digits(tag(dest, "CNPJ") || tag(dest, "CPF")),
    valorTotal: Number(String(tag(total, "vNF") || "0").replace(",", ".")) || 0,
    protocol: tag(section(xml, "protNFe"), "nProt"),
    status: cStat === "100" || cStat === "150" ? "authorized" : "processing",
    chaveAcesso,
  };
}

export async function queueNFeXmlImport(xmlContent: string, fileName?: string) {
  const context = await requireFiscalModule("nfe");
  const orgId = context.orgId as string;
  const xml = String(xmlContent || "").trim();
  if (!xml || !/<(?:nfeProc|NFe|infNFe)\b/i.test(xml)) return { error: "Selecione um XML de NF-e valido." };
  const chaveAcesso = getAccessKey(xml);
  if (!chaveAcesso) return { error: "Nao foi possivel localizar a chave de acesso no XML." };

  const { data: existingInvoice } = await context.supabase.from("fiscal_invoices").select("id").eq("organization_id", orgId).eq("chave_acesso", chaveAcesso).maybeSingle();
  if (existingInvoice) return { error: "Este XML ja foi importado." };

  const { data: queueItem, error: queueError } = await context.supabase.from("nfe_import_queue").insert({ organization_id: orgId, chave_acesso: chaveAcesso, xml_content: xml, metadata: { file_name: fileName || null } }).select("id").single();
  if (queueError || !queueItem) {
    if (queueError?.code === "23505") return { error: "Este XML ja esta na fila de importacao." };
    return { error: queueError?.message || "Nao foi possivel registrar o XML." };
  }

  const parsed = parseNFe(xml, chaveAcesso);
  const { data: company } = await context.supabase.from("company_settings").select("cnpj").eq("organization_id", orgId).maybeSingle();
  const direction = digits(company?.cnpj) === parsed.emitenteDocumento ? "output" : "input";
  const { error: invoiceError } = await context.supabase.from("fiscal_invoices").insert({
    organization_id: orgId,
    tipo_documento: "NFe",
    direction,
    status: parsed.status,
    environment: "production",
    numero: parsed.numero,
    serie: parsed.serie,
    chave_acesso: parsed.chaveAcesso,
    protocol: parsed.protocol,
    valor_total: parsed.valorTotal,
    data_emissao: parsed.dataEmissao,
    natureza_operacao: parsed.naturezaOperacao,
    emitente_nome: parsed.emitenteNome,
    emitente_cnpj: parsed.emitenteDocumento,
    destinatario_nome: parsed.destinatarioNome,
    destinatario_cnpj: parsed.destinatarioDocumento,
    payload_json: { source: "xml_import", queue_id: queueItem.id },
  });
  if (invoiceError) {
    await context.supabase.from("nfe_import_queue").update({ status: "error", error_message: invoiceError.message, updated_at: new Date().toISOString() }).eq("id", queueItem.id);
    return { error: invoiceError.message };
  }
  await context.supabase.from("nfe_import_queue").update({ status: "imported", metadata: { file_name: fileName || null, direction }, updated_at: new Date().toISOString() }).eq("id", queueItem.id);
  revalidatePath("/importar-xml");
  revalidatePath("/notas");
  return { success: true, chaveAcesso };
}

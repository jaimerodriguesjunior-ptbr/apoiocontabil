import { createAdminClient } from "@/lib/supabase-admin";
import { getFiscalModule, type FiscalModule } from "@/lib/fiscal-modules";

export type ReportDocument = {
  id: string;
  tipo_documento: string | null;
  status: string | null;
  direction: string | null;
  valor_total: number | null;
  data_emissao: string | null;
  created_at: string | null;
  numero: string | null;
  serie: string | null;
  chave_acesso: string | null;
  finalidade_nfe: number | null;
  xml_available?: boolean;
  xml_content?: string | null;
  xml_url?: string | null;
};

export type CompanyReport = {
  period: string;
  module: FiscalModule | null;
  companyName: string;
  documents: ReportDocument[];
  xmlAvailableCount: number;
  expenses: { count: number; total: number; items: ReportExpense[] };
  nfse: { authorized: { count: number; total: number }; cancelled: { count: number; total: number }; pending: number };
  nfe: {
    entries: { count: number; total: number };
    sales: { count: number; total: number };
    returns: { count: number; total: number };
    pending: number;
  };
};

export type ReportExpense = {
  id: string;
  amount: number;
  expense_date: string | null;
  spent_at: string | null;
  note: string | null;
};

function parsePeriod(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("Período inválido.");
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(documents: ReportDocument[]) {
  return { count: documents.length, total: documents.reduce((total, item) => total + money(item.valor_total), 0) };
}

function documentDate(document: ReportDocument) {
  return document.data_emissao || document.created_at || "";
}

function compareDocuments(left: ReportDocument, right: ReportDocument) {
  const dateComparison = documentDate(right).localeCompare(documentDate(left));
  if (dateComparison !== 0) return dateComparison;

  const leftNumber = String(left.numero || "");
  const rightNumber = String(right.numero || "");
  const leftNumeric = /^\d+$/.test(leftNumber) ? Number(leftNumber) : null;
  const rightNumeric = /^\d+$/.test(rightNumber) ? Number(rightNumber) : null;
  if (leftNumeric !== null && rightNumeric !== null && leftNumeric !== rightNumeric) return rightNumeric - leftNumeric;

  const numberComparison = rightNumber.localeCompare(leftNumber, "pt-BR", { numeric: true });
  if (numberComparison !== 0) return numberComparison;
  return right.id.localeCompare(left.id);
}

export async function buildCompanyReport(input: {
  organizationId: string;
  period: string;
  includeXml?: boolean;
}) : Promise<CompanyReport> {
  const { organizationId, period, includeXml = false } = input;
  const { start, end } = parsePeriod(period);
  const admin = createAdminClient();
  const fields = [
    "id", "tipo_documento", "status", "direction", "valor_total", "data_emissao", "created_at",
    "numero", "serie", "chave_acesso", "finalidade_nfe",
    "xml_url",
    ...(includeXml ? ["xml_content"] : []),
  ].join(", ");

  const queueFields = includeXml ? "chave_acesso, xml_content" : "chave_acesso";
  const [{ data: organization, error: organizationError }, { data: dated, error: datedError }, { data: fallback, error: fallbackError }, { data: expenses, error: expensesError }, { data: importedXmls, error: importedXmlsError }] = await Promise.all([
    admin.from("organizations").select("name, module_access").eq("id", organizationId).single(),
    admin.from("fiscal_invoices").select(fields).eq("organization_id", organizationId).neq("environment", "homologation").gte("data_emissao", start).lt("data_emissao", end),
    admin.from("fiscal_invoices").select(fields).eq("organization_id", organizationId).neq("environment", "homologation").is("data_emissao", null).gte("created_at", start).lt("created_at", end),
    admin.from("expenses").select("id, amount, expense_date, spent_at, note").eq("organization_id", organizationId).eq("reference_month", period).eq("active", true).order("expense_date", { ascending: false }),
    admin.from("nfe_import_queue").select(queueFields).eq("organization_id", organizationId).eq("status", "imported"),
  ]);

  if (organizationError || !organization) throw new Error("Empresa não encontrada.");
  if (datedError || fallbackError || expensesError || importedXmlsError) throw new Error("Não foi possível consolidar os dados do relatório.");

  const rawDocuments = [...((dated || []) as unknown[]), ...((fallback || []) as unknown[])] as ReportDocument[];
  const importedXmlByKey = new Map(
    ((importedXmls || []) as Array<{ chave_acesso?: string | null; xml_content?: string | null }>)
      .filter((item) => item.chave_acesso)
      .map((item) => [item.chave_acesso as string, item.xml_content || null])
  );
  const documentsWithXml = rawDocuments
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort(compareDocuments)
    .map((item) => ({
      ...item,
      xml_content: item.xml_content || (includeXml ? importedXmlByKey.get(item.chave_acesso || "") || null : undefined),
    }));
  const documentsWithAvailability = documentsWithXml.map((item) => ({
    ...item,
    xml_available: Boolean(item.xml_content || item.xml_url || importedXmlByKey.has(item.chave_acesso || "")),
  }));
  const documents = includeXml
    ? documentsWithAvailability
    : documentsWithAvailability.map((item) => ({
      id: item.id,
      tipo_documento: item.tipo_documento,
      status: item.status,
      direction: item.direction,
      valor_total: item.valor_total,
      data_emissao: item.data_emissao,
      created_at: item.created_at,
      numero: item.numero,
      serie: item.serie,
      chave_acesso: item.chave_acesso,
      finalidade_nfe: item.finalidade_nfe,
      xml_available: item.xml_available,
    }));
  const nfseDocuments = documents.filter((item) => item.tipo_documento === "NFSe");
  const nfeDocuments = documents.filter((item) => item.tipo_documento === "NFe");
  const nfeEntries = nfeDocuments.filter((item) => ["entry", "input"].includes(String(item.direction || "").toLowerCase()));
  const nfeOutput = nfeDocuments.filter((item) => !nfeEntries.includes(item));

  return {
    period,
    module: getFiscalModule(organization.module_access),
    companyName: organization.name,
    documents,
    xmlAvailableCount: documentsWithAvailability.filter((item) => item.xml_available).length,
    expenses: {
      count: expenses?.length || 0,
      total: (expenses || []).reduce((total, item) => total + money(item.amount), 0),
      items: (expenses || []) as ReportExpense[],
    },
    nfse: {
      authorized: sum(nfseDocuments.filter((item) => item.status === "authorized")),
      cancelled: sum(nfseDocuments.filter((item) => item.status === "cancelled")),
      pending: nfseDocuments.filter((item) => ["draft", "processing", "error"].includes(String(item.status))).length,
    },
    nfe: {
      entries: sum(nfeEntries.filter((item) => item.status === "authorized")),
      sales: sum(nfeOutput.filter((item) => item.status === "authorized" && Number(item.finalidade_nfe || 1) === 1)),
      returns: sum(nfeOutput.filter((item) => item.status === "authorized" && Number(item.finalidade_nfe) === 4)),
      pending: nfeDocuments.filter((item) => ["draft", "processing", "error"].includes(String(item.status))).length,
    },
  };
}

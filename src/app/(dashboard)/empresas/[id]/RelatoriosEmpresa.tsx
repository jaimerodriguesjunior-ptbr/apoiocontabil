"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Download, FileArchive, Loader2, ReceiptText, RotateCcw, X } from "lucide-react";
import { getAccountantCompanyReport } from "@/actions/relatorios";
import type { CompanyReport, ReportDocument } from "@/lib/accountant-report";

type DetailKey = "nfse-authorized" | "nfse-cancelled" | "nfse-pending" | "nfe-entries" | "nfe-sales" | "nfe-returns" | "nfe-pending" | "expenses" | "xmls";

const formatMoney = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "-";

function formatPeriod(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function Metric({ label, count, total, hint, onClick }: { label: string; count?: number; total?: number; hint?: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg border border-[#ebe6dc] bg-[#fffdf8] p-4 text-left transition hover:border-[#0f766e] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30"><p className="text-xs font-bold uppercase tracking-wide text-[#716b61]">{label}</p>{total !== undefined && <p className="mt-2 text-xl font-black text-[#25231f]">{formatMoney(total)}</p>}{count !== undefined && <p className="mt-1 text-sm font-semibold text-[#0f766e]">{count} documento{count === 1 ? "" : "s"}</p>}{hint && <p className="mt-1 text-xs font-medium text-[#716b61]">{hint}</p>}<p className="mt-3 text-xs font-bold text-[#0f766e]">Ver detalhes</p></button>;
}

function DocumentRows({ documents, showXml = false }: { documents: ReportDocument[]; showXml?: boolean }) {
  if (!documents.length) return <p className="py-8 text-center text-sm font-medium text-[#716b61]">Nenhum documento neste grupo.</p>;
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#ebe6dc] text-xs uppercase tracking-wide text-[#716b61]"><tr><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Valor</th>{showXml && <th className="px-3 py-2">XML</th>}</tr></thead><tbody>{documents.map((document) => <tr key={document.id} className="border-b border-[#f1ede5] last:border-0"><td className="px-3 py-3 font-semibold text-[#25231f]">{document.tipo_documento || "Documento"} {document.numero ? `nº ${document.numero}` : "sem número"}{document.serie ? ` · série ${document.serie}` : ""}</td><td className="px-3 py-3 text-[#716b61]">{formatDate(document.data_emissao || document.created_at)}</td><td className="px-3 py-3"><span className="status-pill bg-[#f4f0e8] text-[#625c52]">{document.status || "-"}</span></td><td className="px-3 py-3 text-right font-bold text-[#25231f]">{formatMoney(Number(document.valor_total || 0))}</td>{showXml && <td className="px-3 py-3 font-semibold text-[#0f766e]">{document.xml_available ? "Disponível" : "Indisponível"}</td>}</tr>)}</tbody></table></div>;
}

function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25231f]/40 p-4" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-xl bg-[#fffdf8] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="sticky top-0 flex items-center justify-between border-b border-[#ebe6dc] bg-[#fffdf8] px-5 py-4"><h2 className="font-black text-[#25231f]">{title}</h2><button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#716b61] hover:bg-[#f4f0e8] hover:text-[#25231f]" aria-label="Fechar"><X size={20} /></button></header><div className="p-3 sm:p-5">{children}</div></section></div>;
}

export default function RelatoriosEmpresa({ organizationId, initialReport }: { organizationId: string; initialReport: CompanyReport }) {
  const [period, setPeriod] = useState(initialReport.period);
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNfse = report.module === "nfse";
  const isNfe = report.module === "nfe";
  const isNfeEntry = (item: ReportDocument) => ["entry", "input"].includes(String(item.direction || "").toLowerCase());
  const pending = (item: ReportDocument) => ["draft", "processing", "error"].includes(String(item.status));
  const detailDocuments: Record<Exclude<DetailKey, "expenses">, ReportDocument[]> = {
    "nfse-authorized": report.documents.filter((item) => item.tipo_documento === "NFSe" && item.status === "authorized"),
    "nfse-cancelled": report.documents.filter((item) => item.tipo_documento === "NFSe" && item.status === "cancelled"),
    "nfse-pending": report.documents.filter((item) => item.tipo_documento === "NFSe" && pending(item)),
    "nfe-entries": report.documents.filter((item) => item.tipo_documento === "NFe" && isNfeEntry(item) && item.status === "authorized"),
    "nfe-sales": report.documents.filter((item) => item.tipo_documento === "NFe" && !isNfeEntry(item) && item.status === "authorized" && Number(item.finalidade_nfe || 1) === 1),
    "nfe-returns": report.documents.filter((item) => item.tipo_documento === "NFe" && !isNfeEntry(item) && item.status === "authorized" && Number(item.finalidade_nfe) === 4),
    "nfe-pending": report.documents.filter((item) => item.tipo_documento === "NFe" && pending(item)),
    xmls: report.documents,
  };
  const detailTitles: Record<DetailKey, string> = { "nfse-authorized": "NFS-e autorizadas", "nfse-cancelled": "NFS-e canceladas", "nfse-pending": "NFS-e pendentes ou com erro", "nfe-entries": "NF-e de entrada autorizadas", "nfe-sales": "NF-e de venda autorizadas", "nfe-returns": "NF-e de devolução autorizadas", "nfe-pending": "NF-e pendentes ou com erro", expenses: "Despesas lançadas", xmls: "Disponibilidade de XMLs" };
  const updateReport = () => { setError(null); setDetail(null); startTransition(async () => { try { setReport(await getAccountantCompanyReport(organizationId, period)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o relatório."); } }); };
  const downloadZip = () => window.location.assign(`/api/empresas/${organizationId}/relatorios/zip?period=${encodeURIComponent(report.period)}`);

  return <div className="space-y-5">
    <div className="card flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 font-black text-[#25231f]"><ReceiptText size={18} /> Fechamento da empresa</div><p className="mt-1 text-sm font-medium text-[#716b61]">Resumo fiscal de {formatPeriod(report.period)} e documentos disponíveis para a contabilidade.</p></div><div className="flex flex-wrap items-center gap-2"><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-md border border-[#ded8cc] bg-white px-3 py-2 text-sm font-semibold text-[#25231f]" aria-label="Período do relatório" /><button type="button" onClick={updateReport} disabled={isPending} className="inline-flex items-center gap-2 rounded-md border border-[#ded8cc] bg-white px-3 py-2 text-sm font-bold text-[#0f766e] hover:bg-[#f4f0e8] disabled:opacity-60">{isPending ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}Atualizar</button><button type="button" onClick={downloadZip} disabled={isPending} className="inline-flex items-center gap-2 rounded-md bg-[#0f766e] px-3 py-2 text-sm font-bold text-white hover:bg-[#115e59] disabled:opacity-60"><FileArchive size={16} /> Baixar ZIP</button></div></div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle size={16} /> {error}</div>}
    {isNfse && <section className="space-y-3"><div><h2 className="font-black text-[#25231f]">NFS-e</h2><p className="text-sm font-medium text-[#716b61]">Documentos de serviço em produção.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Metric label="Autorizadas" {...report.nfse.authorized} onClick={() => setDetail("nfse-authorized")} /><Metric label="Canceladas" {...report.nfse.cancelled} onClick={() => setDetail("nfse-cancelled")} /><Metric label="Pendentes ou com erro" count={report.nfse.pending} hint="Rascunhos, processamentos e rejeições" onClick={() => setDetail("nfse-pending")} /></div></section>}
    {isNfe && <section className="space-y-3"><div><h2 className="font-black text-[#25231f]">NF-e</h2><p className="text-sm font-medium text-[#716b61]">Entradas importadas e documentos de saída em produção.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Entradas" {...report.nfe.entries} onClick={() => setDetail("nfe-entries")} /><Metric label="Vendas" {...report.nfe.sales} onClick={() => setDetail("nfe-sales")} /><Metric label="Devoluções" {...report.nfe.returns} onClick={() => setDetail("nfe-returns")} /><Metric label="Pendentes ou com erro" count={report.nfe.pending} onClick={() => setDetail("nfe-pending")} /></div></section>}
    {!isNfse && !isNfe && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Configure o módulo fiscal da empresa para visualizar o resumo específico.</div>}
    <section className="grid gap-3 sm:grid-cols-2"><Metric label="Despesas lançadas" {...report.expenses} hint="Lançamentos ativos no período" onClick={() => setDetail("expenses")} /><Metric label="XMLs disponíveis" count={report.xmlAvailableCount} hint={`de ${report.documents.length} documento${report.documents.length === 1 ? "" : "s"} fiscal(is)`} onClick={() => setDetail("xmls")} /></section>
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-[#25231f]">Arquivo de fechamento</h2><p className="mt-1 text-sm font-medium text-[#716b61]">Inclui o resumo CSV, os XMLs encontrados e uma lista dos XMLs indisponíveis.</p></div><button type="button" onClick={downloadZip} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#0f766e] px-3 py-2 text-sm font-bold text-[#0f766e] hover:bg-[#d9f3ee]"><Download size={16} /> Download</button></div>
    {detail && <DetailModal title={detailTitles[detail]} onClose={() => setDetail(null)}>{detail === "expenses" ? (report.expenses.items.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#ebe6dc] text-xs uppercase tracking-wide text-[#716b61]"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2 text-right">Valor</th></tr></thead><tbody>{report.expenses.items.map((item) => <tr key={item.id} className="border-b border-[#f1ede5] last:border-0"><td className="px-3 py-3 text-[#716b61]">{formatDate(item.expense_date)}</td><td className="px-3 py-3 font-semibold text-[#25231f]">{item.note || item.spent_at || "Sem descrição"}</td><td className="px-3 py-3 text-right font-bold text-[#25231f]">{formatMoney(Number(item.amount || 0))}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm font-medium text-[#716b61]">Nenhuma despesa ativa neste período.</p>) : <DocumentRows documents={detailDocuments[detail]} showXml={detail === "xmls"} />}</DetailModal>}
  </div>;
}

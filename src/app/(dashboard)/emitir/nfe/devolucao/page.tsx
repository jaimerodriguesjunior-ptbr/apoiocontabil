import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { getNFeReturnOrigin } from "@/actions/nfe";
import NFeReturnForm from "./NFeReturnForm";

export default async function NFeReturnPage({ searchParams }: { searchParams: Promise<{ origem?: string }> }) {
  const context = await getAuthContext();
  if (!context || !context.orgId || getFiscalModule(context.organization?.module_access) !== "nfe") redirect("/dashboard");
  const { origem } = await searchParams;
  if (!origem) redirect("/notas");
  const result = await getNFeReturnOrigin(origem);
  if (!result.success || !result.origin || !result.supplier || !result.items) {
    return <div className="mx-auto max-w-4xl space-y-5"><Link href="/notas" className="inline-flex items-center gap-1 text-sm font-bold text-[#0f766e]"><ArrowLeft size={16} /> Voltar para notas</Link><div className="card border-red-200 bg-red-50 text-red-800">{result.error || "Nao foi possivel preparar a devolucao."}</div></div>;
  }
  const { data: settings } = await context.supabase.from("company_settings").select("environment").eq("organization_id", context.orgId).maybeSingle();
  const environment = settings?.environment === "production" ? "production" : "homologation";
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/notas" className="inline-flex items-center gap-1 text-sm font-bold text-[#0f766e]"><ArrowLeft size={16} /> Voltar para notas</Link><div><h1 className="page-title flex items-center gap-2"><RotateCcw size={24} /> Devolucao de compra</h1><p className="page-subtitle">Itens e quantidades sao espelhados da NF-e de entrada; a devolucao referencia a chave original.</p></div><NFeReturnForm originId={result.origin.id} originNumber={result.origin.numero || "-"} supplierName={result.supplier.nome} items={result.items} environment={environment} /></div>;
}

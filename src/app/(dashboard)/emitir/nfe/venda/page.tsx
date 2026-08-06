import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";
import { getClients } from "@/actions/clientes";
import { getCatalogItems } from "@/actions/catalogo";
import NFeVendaForm from "./NFeVendaForm";

export default async function NFeVendaPage() {
  const context = await getAuthContext();
  if (!context || getFiscalModule(context.organization?.module_access) !== "nfe" || !context.orgId) redirect("/dashboard");
  const [{ data: settings }, clients, catalogItems] = await Promise.all([
    context.supabase.from("company_settings").select("environment").eq("organization_id", context.orgId).maybeSingle(),
    getClients(),
    getCatalogItems(),
  ]);
  const environment = settings?.environment === "production" ? "production" : "homologation";
  const products = catalogItems.filter((item) => item.item_type === "produto");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/emitir/nfe" className="inline-flex items-center gap-1 text-sm font-bold text-[#0f766e] hover:text-[#115e59]"><ArrowLeft size={16} /> Voltar</Link>
      <div><h1 className="page-title flex items-center gap-2"><Package size={24} /> Venda por NF-e</h1><p className="page-subtitle">A emissao usa produtos do catalogo e calcula o CFOP pela UF do destinatario.</p></div>
      <NFeVendaForm clients={clients} products={products} environment={environment} />
    </div>
  );
}

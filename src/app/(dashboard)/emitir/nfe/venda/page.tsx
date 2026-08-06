import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Package } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";

export default async function NFeVendaPage() {
  const context = await getAuthContext();
  if (getFiscalModule(context?.organization?.module_access) !== "nfe") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/emitir/nfe" className="inline-flex items-center gap-1 text-sm font-bold text-[#0f766e] hover:text-[#115e59]"><ArrowLeft size={16} /> Voltar</Link>
      <div>
        <h1 className="page-title flex items-center gap-2"><Package size={24} /> Venda por NF-e</h1>
        <p className="page-subtitle">A emissÃ£o usarÃ¡ os produtos do catÃ¡logo e calcularÃ¡ o CFOP pela UF do destinatÃ¡rio.</p>
      </div>
      <div className="card flex items-start gap-4 border-amber-200 bg-amber-50">
        <ClipboardCheck className="mt-0.5 shrink-0 text-amber-700" size={22} />
        <div>
          <p className="font-black text-[#25231f]">ConfiguraÃ§Ã£o fiscal em andamento</p>
          <p className="mt-1 text-sm font-medium text-[#716b61]">Cadastre produtos com NCM, CFOP e unidade no catÃ¡logo. A etapa de transmissÃ£o da NF-e serÃ¡ habilitada depois de concluir a validaÃ§Ã£o fiscal e a integraÃ§Ã£o com a Nuvem Fiscal.</p>
        </div>
      </div>
    </div>
  );
}

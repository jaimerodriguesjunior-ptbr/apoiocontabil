import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";

export default async function NFeAssistidaPage() {
  const context = await getAuthContext();
  if (getFiscalModule(context?.organization?.module_access) !== "nfe") redirect("/dashboard");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/emitir/nfe" className="inline-flex items-center gap-1 text-sm font-bold text-[#0f766e] hover:text-[#115e59]"><ArrowLeft size={16} /> Voltar</Link>
      <div>
        <h1 className="page-title flex items-center gap-2"><ShieldCheck size={24} /> Operacao assistida</h1>
        <p className="page-subtitle">Fluxo reservado para operacoes fora da venda padrao.</p>
      </div>
      <div className="card border-amber-200 bg-amber-50">
        <p className="font-black text-[#25231f]">Emissao assistida desabilitada no momento</p>
        <p className="mt-1 text-sm font-medium text-[#716b61]">O fluxo sera liberado depois que a etapa de devolucao for concluida.</p>
      </div>
    </div>
  );
}

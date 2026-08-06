import Link from "next/link";
import { ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";

export default async function EmitirNFePage() {
  const context = await getAuthContext();
  if (getFiscalModule(context?.organization?.module_access) !== "nfe") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="page-title">Emitir NF-e</h1>
        <p className="page-subtitle">Escolha a opera&ccedil;&atilde;o e revise os dados fiscais antes da transmiss&atilde;o.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/emitir/nfe/venda" className="card group border-[#0f766e] transition-transform hover:-translate-y-0.5">
          <FileCheck2 size={28} className="mb-4 text-[#0f766e]" />
          <h2 className="text-xl font-black text-[#25231f]">Venda</h2>
          <p className="mt-2 text-sm font-medium text-[#716b61]">Venda de mercadorias com CFOP calculado pela UF do destinat&aacute;rio.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#0f766e]">Continuar <ArrowRight size={16} /></span>
        </Link>
        <div className="card cursor-not-allowed opacity-60" aria-disabled="true">
          <ShieldCheck size={28} className="mb-4 text-amber-700" />
          <h2 className="text-xl font-black text-[#25231f]">Opera&ccedil;&atilde;o assistida</h2>
          <p className="mt-2 text-sm font-medium text-[#716b61]">Fluxo orientado pelo contador, com revisao dos dados fiscais.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-amber-700">Em breve</span>
        </div>
      </div>
    </div>
  );
}

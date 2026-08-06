import { getClients } from "@/actions/clientes";
import { getCompany } from "@/actions/empresa";
import { getCatalogItems } from "@/actions/catalogo";
import EmitirForm from "./EmitirForm";
import { FilePlus } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";

export default async function EmitirPage() {
  const context = await getAuthContext();
  const fiscalModule = getFiscalModule(context?.organization?.module_access);

  if (fiscalModule === "nfe") redirect("/emitir/nfe");
  if (fiscalModule === "nfce") {
    return <div className="max-w-xl"><h1 className="page-title mb-4">Emissao NFC-e</h1><div className="card"><p className="font-bold text-[#25231f]">O modulo NFC-e esta liberado, mas esta tela ainda nao foi ativada neste sistema.</p><p className="mt-2 text-sm text-[#716b61]">Fale com o escritorio contabil para orientar a emissao.</p></div></div>;
  }
  if (fiscalModule !== "nfse") redirect("/dashboard");

  const [clientes, empresa, catalogItems] = await Promise.all([getClients(), getCompany(), getCatalogItems()]);

  if (!empresa?.cnpj) {
    return (
      <div className="max-w-xl">
        <h1 className="page-title flex items-center gap-2 mb-6"><FilePlus size={24} /> Emitir Nota</h1>
        <div className="card text-center py-10">
          <p className="text-gray-600 font-medium">Configure sua empresa primeiro</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Fale com o escritorio contabil para completar os dados fiscais antes da emissao.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FilePlus size={24} /> Emitir Nota</h1>
        <p className="page-subtitle">Selecione itens do catalogo; servicos viram NFSe no MVP.</p>
      </div>
      <EmitirForm clientes={clientes} empresa={empresa} catalogItems={catalogItems} />
    </div>
  );
}

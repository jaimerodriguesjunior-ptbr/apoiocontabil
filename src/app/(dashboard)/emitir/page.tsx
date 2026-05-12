import { getClients } from "@/actions/clientes";
import { getCompany } from "@/actions/empresa";
import { getCatalogItems } from "@/actions/catalogo";
import EmitirForm from "./EmitirForm";
import { FilePlus } from "lucide-react";

export default async function EmitirPage() {
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

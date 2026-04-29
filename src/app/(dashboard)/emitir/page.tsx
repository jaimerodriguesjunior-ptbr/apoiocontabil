import { getClients } from "@/actions/clientes";
import { getCompany } from "@/actions/empresa";
import EmitirForm from "./EmitirForm";
import { FilePlus } from "lucide-react";
import Link from "next/link";

export default async function EmitirPage() {
  const [clientes, empresa] = await Promise.all([getClients(), getCompany()]);

  if (!empresa?.cnpj) {
    return (
      <div className="max-w-xl">
        <h1 className="page-title flex items-center gap-2 mb-6"><FilePlus size={24} /> Emitir Nota</h1>
        <div className="card text-center py-10">
          <p className="text-gray-600 font-medium">Configure sua empresa primeiro</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            É necessário preencher os dados da empresa antes de emitir notas.
          </p>
          <Link href="/empresa" className="btn-primary">Configurar empresa</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FilePlus size={24} /> Emitir Nota</h1>
        <p className="page-subtitle">Nota avulsa — valor e data livres</p>
      </div>
      <EmitirForm clientes={clientes} empresa={empresa} />
    </div>
  );
}

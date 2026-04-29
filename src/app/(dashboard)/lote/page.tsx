import { getClientsWithServices } from "@/actions/clientes";
import { getCompany } from "@/actions/empresa";
import LoteForm from "./LoteForm";
import { ListOrdered } from "lucide-react";
import Link from "next/link";

export default async function LotePage() {
  const [clientes, empresa] = await Promise.all([getClientsWithServices(), getCompany()]);

  if (!empresa?.cnpj) {
    return (
      <div className="max-w-2xl">
        <h1 className="page-title flex items-center gap-2 mb-6"><ListOrdered size={24} /> Emissão em Lote</h1>
        <div className="card text-center py-10">
          <p className="text-gray-600 font-medium">Configure sua empresa primeiro</p>
          <Link href="/empresa" className="btn-primary mt-4 inline-block">Configurar empresa</Link>
        </div>
      </div>
    );
  }

  const clientesComServico = clientes.filter((c: any) => (c.client_services || []).length > 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><ListOrdered size={24} /> Emissão em Lote</h1>
        <p className="page-subtitle">Emita todas as notas mensais de uma vez</p>
      </div>

      {clientesComServico.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500">Nenhum cliente com serviço mensal cadastrado.</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Cadastre um cliente e adicione um serviço mensal para usar esta função.</p>
          <Link href="/clientes/novo" className="btn-primary">Cadastrar cliente</Link>
        </div>
      ) : (
        <LoteForm clientes={clientesComServico} empresa={empresa} />
      )}
    </div>
  );
}

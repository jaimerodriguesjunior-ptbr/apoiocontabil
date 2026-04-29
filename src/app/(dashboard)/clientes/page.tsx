import Link from "next/link";
import { getClients } from "@/actions/clientes";
import { Plus, Pencil, Users } from "lucide-react";
import DeleteClientButton from "./DeleteClientButton";

export default async function ClientesPage() {
  const clientes = await getClients();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} /> Clientes</h1>
          <p className="page-subtitle">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/clientes/novo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo cliente
        </Link>
      </div>

      {clientes.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum cliente cadastrado ainda.</p>
          <Link href="/clientes/novo" className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={16} /> Adicionar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CPF / CNPJ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Serviço mensal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Valor mensal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c: any) => {
                const servicos = c.client_services || [];
                const totalMensal = servicos.reduce((acc: number, s: any) => acc + (s.valor_mensal || 0), 0);
                const servicoDesc = servicos.length > 0 ? servicos[0].descricao : "—";
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3 text-gray-500">{c.cpf_cnpj || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {servicoDesc}
                      {servicos.length > 1 && <span className="text-gray-400 ml-1">+{servicos.length - 1}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {totalMensal > 0
                        ? totalMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/clientes/${c.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={15} />
                        </Link>
                        <DeleteClientButton id={c.id} nome={c.nome} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

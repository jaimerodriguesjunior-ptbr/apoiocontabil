import Link from "next/link";
import { getDashboardStats, getInvoices } from "@/actions/fiscal";
import { FilePlus, ListOrdered, Users, TrendingUp, FileText, AlertCircle } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; class: string }> = {
  authorized: { label: "Autorizada", class: "bg-green-100 text-green-700" },
  processing: { label: "Processando", class: "bg-yellow-100 text-yellow-700" },
  error: { label: "Erro", class: "bg-red-100 text-red-700" },
  draft: { label: "Rascunho", class: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelada", class: "bg-gray-100 text-gray-500" },
};

export default async function DashboardPage() {
  const [stats, notas] = await Promise.all([
    getDashboardStats(),
    getInvoices({ mes: undefined }),
  ]);

  const recentes = notas.slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Início</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.notasNoMes}</p>
            <p className="text-sm text-gray-500">Notas no mês</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-2.5 bg-green-50 rounded-lg">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalFaturado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-sm text-gray-500">Faturado (autorizadas)</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-2.5 bg-purple-50 rounded-lg">
            <Users size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalClientes}</p>
            <p className="text-sm text-gray-500">Clientes ativos</p>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/emitir"
          className="card hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-4 cursor-pointer"
        >
          <div className="p-3 bg-blue-600 rounded-lg">
            <FilePlus size={22} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Emitir Nota</p>
            <p className="text-sm text-gray-500">Nota avulsa para qualquer cliente</p>
          </div>
        </Link>

        <Link
          href="/lote"
          className="card hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-4 cursor-pointer"
        >
          <div className="p-3 bg-indigo-600 rounded-lg">
            <ListOrdered size={22} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Emissão em Lote</p>
            <p className="text-sm text-gray-500">Emitir todas as notas do mês</p>
          </div>
        </Link>
      </div>

      {/* Notas recentes */}
      {recentes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notas recentes</h2>
            <Link href="/notas" className="text-sm text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="space-y-2">
            {recentes.map((nota: any) => {
              const st = STATUS_LABEL[nota.status] || { label: nota.status, class: "bg-gray-100 text-gray-600" };
              return (
                <div key={nota.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(nota.clients as any)?.nome || "Cliente não encontrado"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{nota.descricao_servico}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.class}`}>
                      {st.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {(nota.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentes.length === 0 && (
        <div className="card text-center py-10">
          <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma nota emitida ainda.</p>
          <p className="text-sm text-gray-400 mt-1">
            Comece cadastrando sua empresa e seus clientes.
          </p>
        </div>
      )}
    </div>
  );
}

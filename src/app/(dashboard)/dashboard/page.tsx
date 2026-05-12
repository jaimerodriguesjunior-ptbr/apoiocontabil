import Link from "next/link";
import { getDashboardStats, getInvoices } from "@/actions/fiscal";
import { getAuthContext } from "@/lib/auth-context";
import { AlertCircle, ArrowUpRight, Boxes, FilePlus, FileText, ListOrdered, ReceiptText, TrendingUp } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  authorized: { label: "Autorizada", className: "bg-emerald-50 text-emerald-700" },
  processing: { label: "Processando", className: "bg-amber-50 text-amber-700" },
  error: { label: "Erro", className: "bg-red-50 text-red-700" },
  draft: { label: "Rascunho", className: "bg-stone-100 text-stone-600" },
  cancelled: { label: "Cancelada", className: "bg-stone-100 text-stone-500" },
};

type RecentInvoice = {
  id: string;
  status: string;
  valor_total?: number | null;
  descricao_servico?: string | null;
  clients?: { nome?: string | null } | null;
};

export default async function DashboardPage() {
  const [stats, notas, context] = await Promise.all([
    getDashboardStats(),
    getInvoices({ mes: undefined }),
    getAuthContext(),
  ]);

  const isAdmin = context?.role === "cliente_admin" || context?.role === "contador";
  const recentes = notas.slice(0, 5) as RecentInvoice[];
  const mesLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-5 md:space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Operação fiscal</p>
          <h1 className="page-title mt-1">Início</h1>
          <p className="page-subtitle capitalize">{mesLabel}</p>
        </div>
        <Link href="/notas" className="hidden items-center gap-2 text-sm font-semibold text-[#0f766e] hover:text-[#115e59] md:inline-flex">
          Ver notas
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/emitir"
          className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#d6cec0] bg-[#0f766e] p-5 text-white shadow-[0_20px_45px_rgba(15,118,110,0.18)] transition-transform hover:-translate-y-0.5"
        >
          <div className="rounded-md bg-white/15 p-3">
            <FilePlus size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black">Emitir uma nota</p>
            <p className="text-sm font-medium text-white/80">Nota avulsa para qualquer cliente</p>
          </div>
        </Link>

        <Link
          href="/lote"
          className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#d6cec0] bg-[#fffdf8] p-5 transition-transform hover:-translate-y-0.5 hover:border-[#0f766e]"
        >
          <div className="rounded-md bg-[#d9f3ee] p-3">
            <ListOrdered size={22} className="text-[#0f766e]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black text-[#25231f]">Emitir nota em lote</p>
            <p className="text-sm font-medium text-[#716b61]">Exclusivo pra nota de serviço</p>
          </div>
        </Link>

        {isAdmin && (
          <Link
            href="/despesas"
            className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#d6cec0] bg-[#fffdf8] p-5 transition-transform hover:-translate-y-0.5 hover:border-[#0f766e]"
          >
            <div className="rounded-md bg-[#d9f3ee] p-3">
              <ReceiptText size={22} className="text-[#0f766e]" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-[#25231f]">Lançar despesa</p>
              <p className="text-sm font-medium text-[#716b61]">Compras e gastos</p>
            </div>
          </Link>
        )}

        <Link
          href="/catalogo"
          className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#d6cec0] bg-[#fffdf8] p-5 transition-transform hover:-translate-y-0.5 hover:border-[#0f766e]"
        >
          <div className="rounded-md bg-amber-50 p-3">
            <Boxes size={22} className="text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black text-[#25231f]">Catálogo</p>
            <p className="text-sm font-medium text-[#716b61]">Produtos e serviços</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <div className="rounded-md bg-[#e7f3f1] p-2.5">
            <FileText size={20} className="text-[#0f766e]" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#25231f]">{stats.notasNoMes}</p>
            <p className="text-sm font-medium text-[#716b61]">Notas no mês</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="rounded-md bg-emerald-50 p-2.5">
            <TrendingUp size={20} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#25231f]">
              {stats.totalFaturado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-sm font-medium text-[#716b61]">Faturado autorizado</p>
          </div>
        </div>

        {isAdmin && (
          <div className="card flex items-center gap-4">
            <div className="rounded-md bg-amber-50 p-2.5">
              <ReceiptText size={20} className="text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#25231f]">
                {(stats.totalDespesasAno || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-sm font-medium text-[#716b61]">Despesas no ano</p>
            </div>
          </div>
        )}
      </div>

      {recentes.length > 0 && (
        <div className="card p-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="px-5 pt-5 font-black text-[#25231f]">Notas recentes</h2>
            <Link href="/notas" className="px-5 pt-5 text-sm font-semibold text-[#0f766e] hover:text-[#115e59]">
              Ver todas
            </Link>
          </div>

          <div>
            {recentes.map((nota) => {
              const status = STATUS_LABEL[nota.status] || {
                label: nota.status,
                className: "bg-stone-100 text-stone-600",
              };

              return (
                <div key={nota.id} className="flex items-center justify-between border-t border-[#ebe6dc] px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#25231f]">
                      {nota.clients?.nome || "Cliente não encontrado"}
                    </p>
                    <p className="truncate text-xs font-medium text-[#716b61]">{nota.descricao_servico}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    <span className={`status-pill ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-sm font-black text-[#25231f]">
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
        <div className="card py-10 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-[#b8afa2]" />
          <p className="font-semibold text-[#716b61]">Nenhuma nota emitida ainda.</p>
          <p className="mt-1 text-sm text-[#8a8378]">
            Comece cadastrando sua empresa e seus clientes.
          </p>
        </div>
      )}
    </div>
  );
}

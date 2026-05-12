import { BarChart3, CalendarDays, ReceiptText } from "lucide-react";
import { getExpenses, getExpenseStats } from "@/actions/despesas";
import { getFixedExpenseTemplates } from "@/actions/despesas-fixas";
import { getAuthContext } from "@/lib/auth-context";
import DespesaForm from "./DespesaForm";
import DeleteDespesaButton from "./DeleteDespesaButton";
import FixedExpenseTemplateForm from "./FixedExpenseTemplateForm";
import DeleteFixedExpenseTemplateButton from "./DeleteFixedExpenseTemplateButton";

const DEFAULT_FIXED_EXPENSES = [
  "FGTS",
  "INSS",
  "Folha de Pgto",
  "Aluguel",
  "Contador",
  "Socios",
  "Compras",
];

type Expense = {
  id: string;
  amount: number;
  spent_at: string;
  note?: string | null;
  expense_date?: string | null;
  reference_month?: string | null;
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default async function DespesasPage() {
  const context = await getAuthContext();
  if (context?.role === "cliente_usuario") {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const [expenses, stats, templates] = await Promise.all([
    getExpenses({ limit: 12 }),
    getExpenseStats(),
    getFixedExpenseTemplates(),
  ]);

  const rows = expenses as Expense[];
  const fixedTemplates = templates as Array<{ id: string; name: string }>;
  const isAdmin = context?.role === "cliente_admin";

  return (
    <div className="mx-auto max-w-6xl space-y-5 md:space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Movimento da empresa</p>
        <h1 className="page-title mt-1 flex items-center gap-2"><ReceiptText size={24} /> Despesas</h1>
        <p className="page-subtitle">Lance compras e gastos para acompanhar o comparativo gerencial.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:max-w-lg">
        <div className="card flex items-center gap-3 p-4 min-w-0">
          <div className="rounded-md bg-[#d9f3ee] p-2 shrink-0">
            <CalendarDays size={18} className="text-[#0f766e]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base sm:text-lg font-black text-[#25231f] truncate" title={formatMoney(stats.totalMes)}>{formatMoney(stats.totalMes)}</p>
            <p className="text-xs font-bold uppercase text-[#716b61]">Mês atual</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4 min-w-0">
          <div className="rounded-md bg-amber-50 p-2 shrink-0">
            <BarChart3 size={18} className="text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base sm:text-lg font-black text-[#25231f] truncate" title={formatMoney(stats.totalAno)}>{formatMoney(stats.totalAno)}</p>
            <p className="text-xs font-bold uppercase text-[#716b61]">Ano atual</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.3fr]">
        <div className="space-y-5">
          <DespesaForm />

          {(isAdmin || context?.role === "contador") && (
            <div className="card space-y-4">
              <div>
                <h2 className="font-black text-[#25231f]">Despesas fixas</h2>
                <p className="mt-1 text-sm font-medium text-[#716b61]">Aparecem no modal mensal até receberem valor.</p>
              </div>

              <FixedExpenseTemplateForm />

              {fixedTemplates.length === 0 ? (
                <p className="text-sm font-medium text-[#716b61]">Nenhuma despesa fixa cadastrada.</p>
              ) : (
                <div className="divide-y divide-[#ebe6dc] rounded-md border border-[#ebe6dc]">
                  {fixedTemplates.map((template) => {
                    const isDefault = DEFAULT_FIXED_EXPENSES.includes(template.name);
                    const canDelete = context?.role === "contador" || !isDefault;

                    return (
                      <div key={template.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="font-bold text-[#25231f]">{template.name}</span>
                        {canDelete ? (
                          <DeleteFixedExpenseTemplateButton id={template.id} name={template.name} />
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-[#a39c90]">Padrão</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-0">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ReceiptText size={34} className="mx-auto mb-3 text-[#b8afa2]" />
              <p className="font-semibold text-[#716b61]">Nenhuma despesa lançada ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#ebe6dc]">
              {rows.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#25231f]">{expense.spent_at}</p>
                    <p className="text-xs font-medium text-[#716b61]">
                      {formatDate(expense.expense_date)} {expense.note ? `- ${expense.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-black text-[#25231f]">{formatMoney(Number(expense.amount || 0))}</span>
                    <DeleteDespesaButton id={expense.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { BarChart3, CalendarDays, ReceiptText } from "lucide-react";
import { getExpenses, getExpenseStats } from "@/actions/despesas";
import { getFixedExpenseTemplates } from "@/actions/despesas-fixas";
import { getAuthContext } from "@/lib/auth-context";
import DespesaForm from "./DespesaForm";
import DespesasClient from "./DespesasClient";
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

      <DespesasClient 
        expenses={rows}
        stats={stats}
        templates={fixedTemplates}
        isAdmin={isAdmin}
        userRole={context.role}
        DEFAULT_FIXED_EXPENSES={DEFAULT_FIXED_EXPENSES}
      />
    </div>
  );
}


"use client";

import { useState } from "react";
import { ReceiptText, History, PlusCircle, CalendarDays, BarChart3 } from "lucide-react";
import DespesaForm from "./DespesaForm";
import DeleteDespesaButton from "./DeleteDespesaButton";
import FixedExpenseTemplateForm from "./FixedExpenseTemplateForm";
import DeleteFixedExpenseTemplateButton from "./DeleteFixedExpenseTemplateButton";

type Expense = {
  id: string;
  amount: number;
  spent_at: string;
  note?: string | null;
  expense_date?: string | null;
  reference_month?: string | null;
};

type DespesasClientProps = {
  expenses: Expense[];
  stats: {
    totalMes: number;
    totalAno: number;
  };
  templates: Array<{ id: string; name: string }>;
  isAdmin: boolean;
  userRole: string;
  DEFAULT_FIXED_EXPENSES: string[];
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function DespesasClient({
  expenses,
  stats,
  templates,
  isAdmin,
  userRole,
  DEFAULT_FIXED_EXPENSES,
}: DespesasClientProps) {
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");

  return (
    <div className="space-y-6">
      {/* Mobile Stats & Tabs */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div className="card flex flex-col justify-center border-l-4 border-l-[#0f766e] bg-[#f0f9f7] p-3">
            <p className="text-[10px] font-bold uppercase text-[#716b61]">Mês atual</p>
            <p className="text-sm font-black text-[#25231f]">{formatMoney(stats.totalMes)}</p>
          </div>
          <div className="card flex flex-col justify-center border-l-4 border-l-amber-500 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold uppercase text-[#716b61]">Ano atual</p>
            <p className="text-sm font-black text-[#25231f]">{formatMoney(stats.totalAno)}</p>
          </div>
        </div>

        <div className="flex rounded-lg bg-[#ebe6dc] p-1">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-bold transition-all ${
              activeTab === "form" ? "bg-white text-[#0f766e] shadow-sm" : "text-[#716b61]"
            }`}
          >
            <PlusCircle size={16} />
            Lançar
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-bold transition-all ${
              activeTab === "list" ? "bg-white text-[#0f766e] shadow-sm" : "text-[#716b61]"
            }`}
          >
            <History size={16} />
            Histórico
          </button>
        </div>
      </div>

      {/* Desktop Stats */}
      <div className="hidden grid-cols-2 gap-3 lg:grid md:max-w-md">
        <div className="card flex items-center gap-3 p-3">
          <div className="rounded-md bg-[#d9f3ee] p-2 shrink-0">
            <CalendarDays size={16} className="text-[#0f766e]" />
          </div>
          <div>
            <p className="text-base font-black text-[#25231f]">{formatMoney(stats.totalMes)}</p>
            <p className="text-[10px] font-bold uppercase text-[#716b61]">Mês atual</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <div className="rounded-md bg-amber-50 p-2 shrink-0">
            <BarChart3 size={16} className="text-amber-700" />
          </div>
          <div>
            <p className="text-base font-black text-[#25231f]">{formatMoney(stats.totalAno)}</p>
            <p className="text-[10px] font-bold uppercase text-[#716b61]">Ano atual</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        {/* Form Column */}
        <div className={`space-y-6 ${activeTab === "form" ? "block" : "hidden lg:block"}`}>
          <DespesaForm />

          {(isAdmin || userRole === "contador") && (
            <div className="card space-y-4">
              <div>
                <h2 className="font-black text-[#25231f]">Despesas fixas</h2>
                <p className="mt-1 text-sm font-medium text-[#716b61]">Aparecem no modal mensal até receberem valor.</p>
              </div>

              <FixedExpenseTemplateForm />

              {templates.length === 0 ? (
                <p className="text-sm font-medium text-[#716b61]">Nenhuma despesa fixa cadastrada.</p>
              ) : (
                <div className="divide-y divide-[#ebe6dc] rounded-md border border-[#ebe6dc]">
                  {templates.map((template) => {
                    const isDefault = DEFAULT_FIXED_EXPENSES.includes(template.name);
                    const canDelete = userRole === "contador" || !isDefault;

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

        {/* List Column */}
        <div className={`card overflow-hidden p-0 ${activeTab === "list" ? "block" : "hidden lg:block"}`}>
          <div className="hidden border-b border-[#ebe6dc] bg-[#faf8f2] p-4 lg:block">
            <h2 className="font-black text-[#25231f]">Últimos lançamentos</h2>
          </div>
          
          {expenses.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ReceiptText size={34} className="mx-auto mb-3 text-[#b8afa2]" />
              <p className="font-semibold text-[#716b61]">Nenhuma despesa lançada ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#ebe6dc]">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-[#25231f]">{expense.spent_at}</p>
                    <p className="truncate text-xs font-medium text-[#716b61]">
                      {formatDate(expense.expense_date)} {expense.note ? `• ${expense.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-sm font-black text-[#25231f] sm:text-base">{formatMoney(Number(expense.amount || 0))}</span>
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

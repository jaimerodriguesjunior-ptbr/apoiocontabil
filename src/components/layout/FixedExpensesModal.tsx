"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Pencil, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { fillFixedExpense, updateFixedExpense } from "@/actions/despesas-fixas";

type FixedExpenseItem = {
  templateId: string;
  name: string;
  entryId: string | null;
  expenseId: string | null;
  amount: number | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export default function FixedExpensesModal({
  referenceMonth,
  items,
  totalInvoicedYear,
  totalExpensesYear,
}: {
  referenceMonth: string;
  items: FixedExpenseItem[];
  totalInvoicedYear: number;
  totalExpensesYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(items);
  
  const pendingCount = useMemo(
    () => rows.filter((item) => item.amount === null).length,
    [rows]
  );

  const balance = totalInvoicedYear - totalExpensesYear;
  const isOk = balance >= 0;

  // Regra do "Refresco": Só para de aparecer se não houver pendências E estiver em equilíbrio
  const needsAttention = pendingCount > 0 || !isOk;

  const [visible, setVisible] = useState(needsAttention);
  const [isForced, setIsForced] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<FixedExpenseItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Lógica de Re-foco (Informativo após tempo inativo)
  useEffect(() => {
    let lastBlurTime = 0;

    const handleBlur = () => {
      lastBlurTime = Date.now();
    };

    const handleFocus = () => {
      if (lastBlurTime === 0) return;
      
      const inactiveMs = Date.now() - lastBlurTime;
      const thresholdMs = 10 * 60 * 1000; // 10 minutos

      // Só abre no foco se ainda precisar de atenção (pendências ou déficit)
      if (inactiveMs > thresholdMs && (pendingCount > 0 || !isOk)) {
        setIsForced(true);
        setVisible(true);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pendingCount, isOk]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setCanClose(true), 5000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  function handleClose() {
    setVisible(false);
    if (isForced && pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  }

  function markAsSaved(templateId: string, amount: number) {
    setRows((current) =>
      current.map((item) =>
        item.templateId === templateId
          ? { ...item, amount, entryId: item.entryId || "saved" }
          : item
      )
    );
  }

  function submitItem(templateId: string) {
    const amount = parseMoney(values[templateId] || "0");

    if (!amount || amount <= 0) return;

    setError(null);
    startTransition(async () => {
      const result = await fillFixedExpense({
        templateId,
        referenceMonth,
        amount,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      markAsSaved(templateId, amount);
      setValues((prev) => ({ ...prev, [templateId]: "" }));
    });
  }

  function openEdit(item: FixedExpenseItem) {
    if (item.amount === null) return;
    setEditing(item);
    setEditValue(String(item.amount).replace(".", ","));
    setError(null);
  }

  function submitEdit() {
    if (!editing) return;
    const amount = parseMoney(editValue || "0");

    setError(null);
    startTransition(async () => {
      const result = await updateFixedExpense({
        templateId: editing.templateId,
        referenceMonth,
        amount,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      markAsSaved(editing.templateId, amount);
      setEditing(null);
      setEditValue("");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-2 pt-4 pb-2 sm:px-4 sm:pt-[8vh] sm:pb-4 bg-[#25231f]/35 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-lg rounded-xl border border-[#ded8cc] bg-[#fffdf8] shadow-[0_24px_70px_rgba(37,35,31,0.25)]" style={{ maxWidth: 'min(32rem, 100%)' }}>
        <div className="flex items-start justify-between gap-3 border-b border-[#ebe6dc] p-3 sm:p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#0f766e]">Controle de Equilíbrio Contábil</p>
            <h2 className="text-lg font-black text-[#25231f]">Resumo do Ano ({referenceMonth.split("-")[0]})</h2>
            <p className="mt-0.5 text-xs font-medium text-[#716b61]">
              Compare seu faturamento com as despesas acumuladas no ano.
            </p>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-[#716b61] hover:bg-[#f4f0e8] hover:text-[#25231f]"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#ebe6dc] border-b border-[#ebe6dc] bg-[#fdfaf3]">
          <div className="px-2 py-2.5 sm:px-4 sm:py-3 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#716b61] truncate">Faturamento</p>
            <p className="text-xs sm:text-base font-black text-indigo-600 truncate" title={formatMoney(totalInvoicedYear)}>{formatMoney(totalInvoicedYear)}</p>
          </div>
          <div className="px-2 py-2.5 sm:px-4 sm:py-3 min-w-0 flex flex-col justify-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#716b61] truncate">Despesas</p>
            <p className="text-xs sm:text-base font-black text-orange-600 truncate" title={formatMoney(totalExpensesYear)}>{formatMoney(totalExpensesYear)}</p>
          </div>
          <div className={`px-2 py-2.5 sm:px-4 sm:py-3 min-w-0 flex flex-col justify-center ${isOk ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#716b61] truncate">Equilíbrio</p>
            <p className={`text-xs sm:text-base font-black truncate ${isOk ? "text-emerald-700" : "text-red-700"}`} title={formatMoney(balance)}>
              {formatMoney(balance)}
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wide text-[#25231f]">Despesas do Mês ({referenceMonth})</h3>
            <span className="text-[10px] font-bold text-[#716b61]">{pendingCount} pendente(s)</span>
          </div>

          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
            {rows.map((item) => {
              if (item.name === "Compras") {
                return (
                  <Link href="/despesas" key={item.templateId} onClick={() => setVisible(false)} className="flex min-h-8 w-full items-center justify-between gap-3 rounded-md border border-[#ebe6dc] bg-white px-2.5 py-1.5 text-left hover:bg-gray-50 transition-colors">
                    <span className="flex min-w-0 items-center gap-2">
                      {item.amount && item.amount > 0 ? (
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-700" />
                      ) : (
                        <span className="h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[#d6cec0]" />
                      )}
                      <span className="truncate text-sm font-black text-[#25231f]">{item.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-black text-[#25231f]">
                      {formatMoney(item.amount || 0)}
                      <ExternalLink size={13} className="text-[#8a8378]" />
                    </span>
                  </Link>
                );
              }

              const isSaved = item.amount !== null;

              return (
                <div key={item.templateId} className="rounded-md border border-[#ebe6dc] bg-white px-2.5 py-1.5">
                  {isSaved ? (
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="flex min-h-8 w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-700" />
                        <span className="truncate text-sm font-black text-[#25231f]">{item.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-sm font-black text-[#25231f]">
                        {formatMoney(item.amount || 0)}
                        <Pencil size={13} className="text-[#8a8378]" />
                      </span>
                    </button>
                  ) : (
                    <label className="flex min-h-8 items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-xs font-black text-[#25231f]">{item.name}</span>
                      <input
                        className="h-8 w-24 rounded-md border border-[#d6cec0] bg-[#fffdf8] px-2.5 text-right text-xs font-bold text-[#25231f] outline-none transition-colors focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 disabled:opacity-60"
                        placeholder="0,00"
                        onChange={(event) =>
                          setValues((prev) => ({ ...prev, [item.templateId]: event.target.value }))
                        }
                        onFocus={(event) => event.currentTarget.select()}
                        onBlur={() => submitItem(item.templateId)}
                        disabled={isPending}
                        inputMode="decimal"
                        aria-label={`Valor de ${item.name}`}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">{error}</p>}

          {!canClose && (
            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wide text-[#8a8378]">
              O botão de fechar aparece em alguns segundos.
            </p>
          )}
        </div>
      </div>

      {editing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#25231f]/45 p-4">
          <div className="w-full max-w-xs rounded-xl border border-[#ded8cc] bg-[#fffdf8] p-4 shadow-[0_20px_60px_rgba(37,35,31,0.25)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#0f766e]">Alterar despesa</p>
                <h3 className="text-base font-black text-[#25231f]">{editing.name}</h3>
                <p className="text-xs font-medium text-[#716b61]">{referenceMonth}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md p-1.5 text-[#716b61] hover:bg-[#f4f0e8]"
                aria-label="Fechar edição"
              >
                <X size={15} />
              </button>
            </div>

            <label className="text-xs font-bold text-[#25231f]" htmlFor="fixed-expense-edit">Valor</label>
            <input
              id="fixed-expense-edit"
              className="mt-1 block h-9 w-full rounded-md border border-[#d6cec0] bg-[#fffdf8] px-3 text-sm font-bold text-[#25231f] outline-none transition-colors focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 disabled:opacity-60"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              inputMode="decimal"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" disabled={isPending} onClick={submitEdit} className="btn-primary">
                Salvar alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

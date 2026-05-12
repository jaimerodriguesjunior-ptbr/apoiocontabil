"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toggleFixedExpenseForCompany } from "@/actions/empresas";

type FixedExpenseConfig = {
  name: string;
  enabled: boolean;
};

const ALL_FIXED_EXPENSES = [
  "FGTS",
  "INSS",
  "Folha de Pgto",
  "Aluguel",
  "Contador",
  "Socios",
  "Compras",
];

export default function ConfigDespesasFixas({
  organizationId,
  disabledExpenses,
}: {
  organizationId: string;
  disabledExpenses: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [disabled, setDisabled] = useState<string[]>(disabledExpenses);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const items: FixedExpenseConfig[] = ALL_FIXED_EXPENSES.map((name) => ({
    name,
    enabled: !disabled.includes(name),
  }));

  function handleToggle(name: string, enable: boolean) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await toggleFixedExpenseForCompany({
        organizationId,
        expenseName: name,
        enabled: enable,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setDisabled((prev) =>
        enable ? prev.filter((n) => n !== name) : [...prev, name]
      );
      setSuccess(`${name} ${enable ? "ativada" : "desativada"} com sucesso.`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <h2 className="font-black text-[#25231f]">Despesas fixas obrigatórias</h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">
            Selecione quais despesas a empresa deverá preencher mensalmente no modal de equilíbrio contábil.
          </p>
        </div>

        <div className="divide-y divide-[#ebe6dc] rounded-md border border-[#ebe6dc]">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="font-bold text-[#25231f]">{item.name}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(item.name, !item.enabled)}
                className={`flex h-8 w-14 items-center rounded-full px-1 transition-colors disabled:opacity-50 ${
                  item.enabled
                    ? "bg-[#0f766e] justify-end"
                    : "bg-[#d6cec0] justify-start"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform`}
                >
                  {item.enabled ? (
                    <Check size={12} className="text-[#0f766e]" />
                  ) : (
                    <X size={12} className="text-[#a39c90]" />
                  )}
                </span>
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {success}
          </p>
        )}
      </div>
    </div>
  );
}

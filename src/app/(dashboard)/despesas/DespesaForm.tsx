"use client";

import { useState, useTransition } from "react";
import { ReceiptText } from "lucide-react";
import { saveExpense } from "@/actions/despesas";

export default function DespesaForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    spentAt: "",
    note: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await saveExpense({
        amount: Number(form.amount.replace(/\./g, "").replace(",", ".")) || 0,
        spentAt: form.spentAt,
        note: form.note,
        expenseDate: form.expenseDate,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setForm({
        amount: "",
        spentAt: "",
        note: "",
        expenseDate: new Date().toISOString().slice(0, 10),
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-black text-[#25231f]">
          <ReceiptText size={18} /> Lançar despesa
        </h2>
        <p className="mt-1 text-sm font-medium text-[#716b61]">Informe apenas o essencial.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Valor gasto</label>
          <input className="input" value={form.amount} onChange={(event) => setField("amount", event.target.value)} placeholder="0,00" required />
        </div>
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" value={form.expenseDate} onChange={(event) => setField("expenseDate", event.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Onde foi gasto</label>
        <input className="input" value={form.spentAt} onChange={(event) => setField("spentAt", event.target.value)} placeholder="Ex: Mercado, aluguel, energia" required />
      </div>

      <div>
        <label className="label">Observação</label>
        <textarea
          className="input min-h-24 resize-none"
          value={form.note}
          onChange={(event) => setField("note", event.target.value)}
          placeholder="Opcional"
        />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Despesa lançada.</p>}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Salvando..." : "Salvar despesa"}
      </button>
    </form>
  );
}

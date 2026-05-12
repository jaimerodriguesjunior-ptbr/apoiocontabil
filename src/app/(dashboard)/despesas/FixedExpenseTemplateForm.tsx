"use client";

import { useState, useTransition } from "react";
import { Pin } from "lucide-react";
import { saveFixedExpenseTemplate } from "@/actions/despesas-fixas";

export default function FixedExpenseTemplateForm() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await saveFixedExpenseTemplate(name);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setName("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Nova despesa fixa</label>
        <div className="flex gap-2">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Aluguel" />
          <button type="submit" disabled={isPending} className="btn-secondary shrink-0 px-3">
            <Pin size={15} />
            {isPending ? "..." : "Adicionar"}
          </button>
        </div>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}

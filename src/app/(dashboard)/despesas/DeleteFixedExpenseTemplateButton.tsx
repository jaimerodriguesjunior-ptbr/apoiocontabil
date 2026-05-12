"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteFixedExpenseTemplate } from "@/actions/despesas-fixas";

export default function DeleteFixedExpenseTemplateButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Remover "${name}" das despesas fixas?`)) return;

    startTransition(async () => {
      await deleteFixedExpenseTemplate(id);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#8a8378] hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      aria-label={`Remover ${name}`}
    >
      <Trash2 size={15} />
    </button>
  );
}

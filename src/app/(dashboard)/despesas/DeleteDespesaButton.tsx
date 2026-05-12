"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/actions/despesas";

export default function DeleteDespesaButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Excluir esta despesa?")) return;

    startTransition(async () => {
      await deleteExpense(id);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#8a8378] transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      aria-label="Excluir despesa"
    >
      <Trash2 size={16} />
    </button>
  );
}

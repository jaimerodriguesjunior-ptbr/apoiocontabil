"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteClient } from "@/actions/clientes";
import { useRouter } from "next/navigation";

export default function DeleteClientButton({ id, nome }: { id: string; nome: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Excluir"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-gray-500">Excluir {nome}?</span>
      <button
        onClick={() => {
          startTransition(async () => {
            await deleteClient(id);
            router.refresh();
          });
        }}
        disabled={isPending}
        className="text-red-600 hover:underline font-medium disabled:opacity-50"
      >
        Sim
      </button>
      <button onClick={() => setConfirm(false)} className="text-gray-400 hover:underline">
        Não
      </button>
    </span>
  );
}

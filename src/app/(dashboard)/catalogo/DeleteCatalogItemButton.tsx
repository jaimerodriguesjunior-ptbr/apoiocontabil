"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCatalogItem } from "@/actions/catalogo";

export default function DeleteCatalogItemButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Remover "${name}" do catalogo?`)) return;

    startTransition(async () => {
      await deleteCatalogItem(id);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      aria-label={`Remover ${name}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#8a8378] transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}

"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card space-y-2">
        <p className="text-lg font-bold text-[#25231f]">Ocorreu um erro inesperado</p>
        <p className="text-sm text-[#716b61]">
          A página encontrou uma falha durante o carregamento. Você pode tentar novamente sem perder o acesso ao sistema.
        </p>
        {error.digest ? (
          <p className="rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
            Referência: {error.digest}
          </p>
        ) : null}
        <div className="pt-1">
          <button type="button" className="btn-primary" onClick={reset}>
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

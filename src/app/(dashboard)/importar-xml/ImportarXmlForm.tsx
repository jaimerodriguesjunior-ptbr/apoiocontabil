"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FileUp } from "lucide-react";
import { queueNFeXmlImport } from "@/actions/nfe-import";

export default function ImportarXmlForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleFile(file?: File) {
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (!/\.xml$/i.test(file.name)) {
      setError("Selecione um arquivo XML.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("NÃ£o foi possÃ­vel ler o arquivo selecionado.");
    reader.onload = () => {
      startTransition(async () => {
        const result = await queueNFeXmlImport(String(reader.result || ""), file.name);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSuccess(result.chaveAcesso || "XML importado.");
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="card max-w-2xl space-y-5">
      <div className="rounded-lg border border-dashed border-[#0f766e] bg-[#f3fbf9] p-8 text-center">
        <FileUp size={34} className="mx-auto mb-3 text-[#0f766e]" />
        <p className="font-black text-[#25231f]">Selecione o XML da NF-e de entrada</p>
        <p className="mt-1 text-sm font-medium text-[#716b61]">A nota serÃ¡ preparada para consulta e devoluÃ§Ã£o.</p>
        <label className="btn-primary mt-5 inline-flex cursor-pointer items-center gap-2">
          {isPending ? "Importando..." : "Escolher XML"}
          <input type="file" accept=".xml,text/xml,application/xml" className="sr-only" disabled={isPending} onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      {success && <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} /> XML adicionado Ã  fila. Chave: {success}</p>}
    </div>
  );
}

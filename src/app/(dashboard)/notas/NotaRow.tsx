"use client";

import { useState, useTransition } from "react";
import { consultarNFSe } from "@/actions/fiscal";
import { RefreshCw, FileDown, ExternalLink } from "lucide-react";

const STATUS: Record<string, { label: string; class: string }> = {
  authorized: { label: "Autorizada", class: "bg-green-100 text-green-700" },
  processing: { label: "Processando", class: "bg-yellow-100 text-yellow-700" },
  error: { label: "Erro", class: "bg-red-100 text-red-700" },
  draft: { label: "Rascunho", class: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelada", class: "bg-gray-100 text-gray-500" },
};

export default function NotaRow({ nota }: { nota: any }) {
  const [status, setStatus] = useState(nota.status);
  const [numero, setNumero] = useState(nota.numero);
  const [pdfUrl, setPdfUrl] = useState(nota.pdf_url);
  const [xmlUrl, setXmlUrl] = useState(nota.xml_url);
  const [errorMsg, setErrorMsg] = useState(nota.error_message);
  const [isPending, startTransition] = useTransition();

  const st = STATUS[status] || { label: status, class: "bg-gray-100 text-gray-600" };

  function consultar() {
    startTransition(async () => {
      const res = await consultarNFSe(nota.id);
      if (res.success && res.data) {
        setStatus(res.status || status);
        setNumero(res.data.numero || numero);
        setPdfUrl(res.data.pdf_url || res.data.link_url || pdfUrl);
        setXmlUrl(res.data.xml_url || xmlUrl);
      }
    });
  }

  const dataEmissao = nota.data_emissao || nota.created_at;
  const dataFmt = dataEmissao
    ? new Date(dataEmissao).toLocaleDateString("pt-BR")
    : "—";

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{dataFmt}</td>
      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">
        {nota.clients?.nome || "—"}
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={nota.descricao_servico}>
        {nota.descricao_servico || "—"}
      </td>
      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
        {(nota.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </td>
      <td className="px-4 py-3 text-gray-500">{numero || "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.class}`}>{st.label}</span>
        {status === "error" && errorMsg && (
          <p className="text-xs text-red-500 mt-0.5 max-w-[180px] truncate" title={errorMsg}>{errorMsg}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          {(status === "processing" || status === "draft") && (
            <button
              onClick={consultar}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Consultar status"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            </button>
          )}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="PDF">
              <FileDown size={14} />
            </a>
          )}
          {xmlUrl && (
            <a href={xmlUrl} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="XML">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { emitNFeReturn } from "@/actions/nfe";

type Item = { codigo: string; descricao: string; ncm: string; unidade: string; quantidade: number; valor_unitario: number };

export default function NFeReturnForm({ originId, originNumber, supplierName, items, environment }: { originId: string; originNumber: string; supplierName: string; items: Item[]; environment: "production" | "homologation" }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedItems = useMemo(() => items.filter((item) => selected[item.codigo] > 0).map((item) => ({ ...item, quantidade: selected[item.codigo] })), [items, selected]);
  const total = selectedItems.reduce((sum, item) => sum + item.quantidade * item.valor_unitario, 0);

  function setQuantity(item: Item, raw: string) {
    const value = Number(raw.replace(",", "."));
    setSelected((current) => ({ ...current, [item.codigo]: Number.isFinite(value) ? Math.max(0, Math.min(item.quantidade, value)) : 0 }));
  }

  function submit() {
    if (!selectedItems.length) return setError("Selecione ao menos um item e informe a quantidade para devolver.");
    const confirmed = window.confirm(`Emitir devolucao da NF-e ${originNumber} em ${environment === "production" ? "PRODUCAO" : "HOMOLOGACAO"}?\n\nFornecedor: ${supplierName}\nItens: ${selectedItems.length}\nTotal: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await emitNFeReturn({ originInvoiceId: originId, items: selectedItems.map((item) => ({ codigo: item.codigo, quantidade: item.quantidade })) });
      if (result.error) return setError(result.error);
      router.push("/notas");
      router.refresh();
    });
  }

  return <div className="space-y-5"><div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${environment === "production" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>Ambiente: {environment === "production" ? "Producao" : "Homologacao"}</div><div className="card"><p className="text-sm text-[#716b61]">NF-e de origem: <strong>{originNumber}</strong></p><p className="mt-1 font-bold text-[#25231f]">Fornecedor: {supplierName}</p></div><div className="card overflow-hidden p-0"><div className="border-b border-[#ebe6dc] px-5 py-4 font-black text-[#25231f]">Itens da nota de entrada</div><div className="divide-y divide-[#ebe6dc]">{items.map((item) => <div key={item.codigo} className="grid gap-3 p-4 md:grid-cols-[1fr_125px_130px]"><div><p className="font-bold text-[#25231f]">{item.descricao}</p><p className="text-xs text-[#716b61]">Codigo {item.codigo} · NCM {item.ncm} · {item.quantidade} {item.unidade} disponivel</p></div><p className="self-center text-sm font-bold text-[#716b61]">{item.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><div><label className="label">Qtd. devolver</label><input className="input" type="number" min="0" max={item.quantidade} step="0.001" value={selected[item.codigo] || ""} onChange={(event) => setQuantity(item, event.target.value)} placeholder="0" /></div></div>)}</div><div className="flex justify-between border-t border-[#ebe6dc] px-5 py-4"><span className="font-bold text-[#716b61]">Total da devolucao</span><span className="text-lg font-black text-[#25231f]">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} /> A nota sera emitida sem cobranca</div><p className="mt-1">Finalidade de devolucao, pagamento 90 e chave da NF-e de origem serao enviados automaticamente.</p></div>{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}<button type="button" onClick={submit} disabled={isPending || !selectedItems.length} className="btn-primary">{isPending ? "Emitindo..." : "Emitir NF-e de devolucao"}</button></div>;
}

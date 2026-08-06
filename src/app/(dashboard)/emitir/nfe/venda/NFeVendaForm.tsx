"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";
import { saveNFeVendaDraft, sendNFeVendaDraft } from "@/actions/nfe";

type Client = { id: string; nome: string; cpf_cnpj?: string | null };
type Product = { id: string; name: string; price?: number | null; ncm?: string | null; codigo?: string | null; unidade?: string | null };
type Item = { id: string; catalogItemId: string; codigo: string; descricao: string; ncm: string; unidade: string; quantidade: number; valorUnitario: number };

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const UNITS = [
  { value: "M3", label: "m³" },
  { value: "UN", label: "un" },
  { value: "KG", label: "kg" },
  { value: "TON", label: "ton" },
  { value: "MT", label: "m" },
  { value: "L", label: "L" },
];

export default function NFeVendaForm({ clients, products, environment }: { clients: Client[]; products: Product[]; environment: "production" | "homologation" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);

  function addProduct(selectedProductId: string) {
    const product = products.find((entry) => entry.id === selectedProductId);
    if (!product) return setError("Selecione um produto do catalogo.");
    setItems((current) => [...current, { id: crypto.randomUUID(), catalogItemId: product.id, codigo: product.codigo || "", descricao: product.name, ncm: product.ncm || "", unidade: product.unidade || "UN", quantidade: 1, valorUnitario: Number(product.price || 0) }]);
    setProductId("");
    setError(null);
  }

  function updateItem(id: string, field: "quantidade" | "valorUnitario" | "unidade", value: string) {
    if (field === "unidade") {
      setItems((current) => current.map((item) => item.id === id ? { ...item, unidade: value } : item));
      return;
    }
    const numeric = Number(value.replace(",", "."));
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: Number.isFinite(numeric) ? numeric : 0 } : item));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await saveNFeVendaDraft({ clientId, items });
        if (result.error) return setError(result.error);
        setSuccess(`Rascunho validado. Revise os itens e envie para ${environment === "production" ? "producao" : "homologacao"} quando estiver pronto.`);
        setDraftId(result.invoiceId || null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Nao foi possivel salvar o rascunho.");
      }
    });
  }

  function sendDraft() {
    if (!draftId) return;
    setError(null);
    startTransition(async () => {
      const result = await sendNFeVendaDraft(draftId);
      if (result.error) return setError(result.error);
      router.push("/notas");
      router.refresh();
    });
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="card space-y-4">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${environment === "production" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>Ambiente: {environment === "production" ? "Produção" : "Homologação"}</div>
      <div><label className="label">Destinatario</label><div className="flex gap-2"><select className="input" value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Selecione o cliente...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome} {client.cpf_cnpj ? `- ${client.cpf_cnpj}` : ""}</option>)}</select><Link href="/clientes/novo" className="btn-secondary inline-flex h-11 w-11 shrink-0 items-center justify-center text-lg" title="Cadastrar cliente" aria-label="Cadastrar cliente">+</Link></div></div>
      <div className="flex gap-2"><select className="input" value={productId} onChange={(event) => { const selectedProductId = event.target.value; setProductId(selectedProductId); if (selectedProductId) addProduct(selectedProductId); }}><option value="">Selecione um produto...</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.ncm ? `- NCM ${product.ncm}` : ""}</option>)}</select><Link href="/catalogo" className="btn-secondary inline-flex h-11 w-11 shrink-0 items-center justify-center text-lg" title="Cadastrar produto" aria-label="Cadastrar produto">+</Link></div>
      {products.length === 0 && <p className="text-sm font-medium text-amber-700">Cadastre produtos com NCM no <Link href="/catalogo" className="underline">catalogo</Link> antes de continuar.</p>}
    </div>
    <div className="card overflow-hidden p-0">
      <div className="border-b border-[#ebe6dc] px-5 py-4 font-black text-[#25231f]">Itens da NF-e</div>
      {items.length === 0 ? <p className="px-5 py-8 text-center text-sm font-medium text-[#716b61]">Nenhum produto adicionado.</p> : <div className="divide-y divide-[#ebe6dc]">{items.map((item) => <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_110px_90px_140px_auto]"><div><p className="font-bold text-[#25231f]">{item.descricao}</p><p className="text-xs text-[#716b61]">NCM {item.ncm || "nao informado"}</p></div><input aria-label="Quantidade" className="input" type="number" min="0.001" step="0.001" value={item.quantidade} onChange={(event) => updateItem(item.id, "quantidade", event.target.value)} /><select aria-label="Unidade" className="input" value={item.unidade} onChange={(event) => updateItem(item.id, "unidade", event.target.value)}>{!UNITS.some((unit) => unit.value === item.unidade) && <option value={item.unidade}>{item.unidade}</option>}{UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select><input aria-label="Valor unitario" className="input" type="number" min="0.01" step="0.01" value={item.valorUnitario} onChange={(event) => updateItem(item.id, "valorUnitario", event.target.value)} /><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Remover ${item.descricao}`}><Trash2 size={18} /></button></div>)}</div>}
      <div className="flex justify-between border-t border-[#ebe6dc] px-5 py-4"><span className="font-bold text-[#716b61]">Total dos produtos</span><span className="text-lg font-black text-[#25231f]">{money(total)}</span></div>
    </div>
    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    {success && <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} /> {success}</p>}
    <div className="flex flex-wrap gap-3"><button type="submit" className="btn-primary" disabled={isPending || !items.length || Boolean(draftId)}>{isPending ? "Validando..." : draftId ? "Rascunho pronto para envio" : "Salvar e validar rascunho"}</button>{draftId && <button type="button" onClick={sendDraft} className="btn-secondary" disabled={isPending}>Enviar NF-e em {environment === "production" ? "produção" : "homologação"}</button>}</div>
  </form>;
}

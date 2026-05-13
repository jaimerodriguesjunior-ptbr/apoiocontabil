"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, Package, Plus, Trash2, Wrench } from "lucide-react";
import { emitirNFSe } from "@/actions/fiscal";

type Client = {
  id: string;
  nome: string;
  cpf_cnpj?: string | null;
};

type Empresa = {
  codigo_servico_padrao?: string | null;
  environment?: string | null;
};

type CatalogItem = {
  id: string;
  name: string;
  item_type: "produto" | "servico";
  price?: number | null;
  ncm?: string | null;
};

type SelectedItem = {
  id: string;
  catalogItemId: string;
  name: string;
  itemType: "produto" | "servico";
  price: number;
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moneyInputToNumber(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function EmitirForm({
  clientes,
  empresa,
  catalogItems,
}: {
  clientes: Client[];
  empresa: Empresa;
  catalogItems: CatalogItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string; invoiceId?: string } | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [environment, setEnvironment] = useState(empresa.environment || "production");
  const [items, setItems] = useState<SelectedItem[]>([]);

  const serviceItems = items.filter((item) => item.itemType === "servico");
  const productItems = items.filter((item) => item.itemType === "produto");
  const serviceTotal = serviceItems.reduce((sum, item) => sum + item.price, 0);
  const productTotal = productItems.reduce((sum, item) => sum + item.price, 0);
  const total = serviceTotal + productTotal;

  function handleCatalogChange(nextId: string) {
    setCatalogItemId(nextId);
    const item = catalogItems.find((catalogItem) => catalogItem.id === nextId);
    setCustomPrice(item?.price != null ? String(item.price).replace(".", ",") : "");
  }

  function addItem() {
    const catalogItem = catalogItems.find((item) => item.id === catalogItemId);
    if (!catalogItem) {
      setResult({ success: false, error: "Selecione um item do catalogo." });
      return;
    }

    const price = customPrice ? moneyInputToNumber(customPrice) : Number(catalogItem.price || 0);
    if (price <= 0) {
      setResult({ success: false, error: "Informe um valor maior que zero para o item." });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        catalogItemId: catalogItem.id,
        name: catalogItem.name,
        itemType: catalogItem.item_type,
        price,
      },
    ]);
    setCatalogItemId("");
    setCustomPrice("");
    setResult(null);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!clienteId) {
      setResult({ success: false, error: "Selecione um cliente." });
      return;
    }

    if (items.length === 0) {
      setResult({ success: false, error: "Adicione pelo menos um item." });
      return;
    }

    if (serviceItems.length === 0) {
      setResult({ success: false, error: "Esta emissao tem apenas produtos. NFCe ficara para a fase 2 do MVP." });
      return;
    }

    if (!empresa.codigo_servico_padrao?.trim()) {
      setResult({ success: false, error: "O escritorio contabil precisa configurar o codigo de servico antes da emissao." });
      return;
    }

    const descricao = serviceItems.map((item) => item.name).join(" | ");
    const warning = productItems.length > 0
      ? `\n\nProdutos ignorados no MVP: ${productItems.map((item) => item.name).join(", ")}.`
      : "";

    setResult(null);
    startTransition(async () => {
      const response = await emitirNFSe({
        clientId: clienteId,
        descricao,
        valor: serviceTotal,
        environment: environment as "production" | "homologation",
      });

      setResult({
        ...response,
        invoiceId: response.invoiceId ?? undefined,
        error: response.error ? `${response.error}${warning}` : undefined,
      });

      if (response.success) {
        setItems([]);
        setClienteId("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="card space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select
              className="input disabled:opacity-60 disabled:cursor-not-allowed"
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
              required
              disabled={items.length > 0}
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}{cliente.cpf_cnpj ? ` - ${cliente.cpf_cnpj}` : ""}
                </option>
              ))}
            </select>
            {clientes.length === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Nenhum cliente cadastrado. <Link href="/clientes/novo" className="underline">Cadastrar agora</Link>
              </p>
            )}
            {items.length > 0 && (
              <p className="mt-1 text-xs font-medium text-[#716b61]">
                Remova os itens adicionados para trocar de cliente.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <label className="label">Item do catalogo</label>
              <select className="input" value={catalogItemId} onChange={(event) => handleCatalogChange(event.target.value)}>
                <option value="">Buscar produto ou servico...</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item_type === "servico" ? "Serviço" : "Produto"} - {item.name}
                  </option>
                ))}
              </select>
              {catalogItems.length === 0 && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Cadastre produtos e serviços no <Link href="/catalogo" className="underline">catálogo</Link>.
                </p>
              )}
            </div>
            <div>
              <label className="label">Valor</label>
              <input className="input" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={addItem}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 font-bold transition-all border ${
                catalogItemId
                  ? "bg-[#0f766e] text-white hover:bg-[#115e59] shadow-md border-transparent animate-in zoom-in duration-300"
                  : "bg-white text-[#716b61] border-[#d6cec0] hover:bg-[#faf9f5]"
              }`}
            >
              <Plus size={18} /> Incluir na nota
            </button>
            {catalogItemId && (
              <p className="text-center text-xs font-medium text-amber-700 animate-in fade-in">
                👆 Clique aqui para adicionar o valor ao resumo da nota
              </p>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <div>
            <label className="label">Ambiente ativo</label>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              environment === "production" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {environment === "production" ? "Producao" : "Homologacao (Testes)"}
            </div>
            <p className="mt-2 text-[10px] font-medium text-[#716b61]">
              Definido pelo contador nas configurações da empresa.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-0">
          <div className="border-b border-[#ebe6dc] p-5">
            <h2 className="font-black text-[#25231f]">Resumo da emissao</h2>
            <p className="mt-1 text-sm font-medium text-[#716b61]">No MVP, apenas servicos geram NFSe.</p>
          </div>

          {items.length === 0 ? (
            <p className="p-5 text-sm font-medium text-[#716b61]">Nenhum item adicionado.</p>
          ) : (
            <div className="divide-y divide-[#ebe6dc]">
              {items.map((item) => {
                const isService = item.itemType === "servico";

                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`rounded-md p-2 ${isService ? "bg-[#d9f3ee]" : "bg-amber-50"}`}>
                        {isService ? <Wrench size={16} className="text-[#0f766e]" /> : <Package size={16} className="text-amber-700" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#25231f]">{item.name}</p>
                        <p className="text-xs font-medium text-[#716b61]">{isService ? "Servico para NFSe" : "Produto - NFCe fase 2"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-black text-[#25231f]">{formatMoney(item.price)}</span>
                      <button type="button" onClick={() => removeItem(item.id)} className="rounded-md p-2 text-[#8a8378] hover:bg-red-50 hover:text-red-700">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 border-t border-[#ebe6dc] bg-[#faf8f2] p-5">
            <div className="flex justify-between text-sm font-bold text-[#716b61]">
              <span>Servicos</span>
              <span>{formatMoney(serviceTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#716b61]">
              <span>Produtos</span>
              <span>{formatMoney(productTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-black text-[#25231f]">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        {productItems.length > 0 && serviceItems.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            Produtos serao ignorados nesta fase. A NFSe sera emitida apenas com os servicos.
          </div>
        )}

        {result?.success && (
          <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Nota enviada com sucesso.</p>
              <p className="mt-0.5">Acompanhe em <Link href="/notas" className="underline">Notas Emitidas</Link>.</p>
            </div>
          </div>
        )}

        {result && !result.success && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-3 text-sm font-medium text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Erro ao emitir</p>
              <p className="mt-0.5 whitespace-pre-wrap">{result.error}</p>
            </div>
          </div>
        )}

        <button type="submit" disabled={isPending || items.length === 0} className="btn-primary w-full py-3">
          {isPending ? "Emitindo..." : "Emitir NFSe"}
        </button>
      </div>
    </form>
  );
}

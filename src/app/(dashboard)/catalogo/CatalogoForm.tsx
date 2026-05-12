"use client";

import { useState, useTransition } from "react";
import { Package, PackagePlus, Wrench } from "lucide-react";
import { saveCatalogItem } from "@/actions/catalogo";

export default function CatalogoForm() {
  const [activeTab, setActiveTab] = useState<"servico" | "produto" | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    ncm: "",
  });

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTab) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await saveCatalogItem({
        name: form.name,
        itemType: activeTab,
        price: Number(form.price.replace(",", ".")) || 0,
        ncm: form.ncm,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setForm({ name: "", price: "", ncm: "" });
    });
  }

  function toggleTab(tab: "servico" | "produto") {
    setSuccess(false);
    setError(null);
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-sm font-black text-[#25231f] mb-3 uppercase tracking-wide">Cadastrar Novo Item</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => toggleTab("servico")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 font-bold transition-all border ${
              activeTab === "servico"
                ? "border-[#0f766e] bg-[#0f766e] text-white shadow-md"
                : "border-[#d6cec0] bg-[#fffdf8] text-[#716b61] hover:border-[#0f766e] hover:text-[#0f766e]"
            }`}
          >
            <Wrench size={16} /> Serviço
          </button>

          <button
            type="button"
            onClick={() => toggleTab("produto")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 font-bold transition-all border ${
              activeTab === "produto"
                ? "border-amber-600 bg-amber-600 text-white shadow-md"
                : "border-[#d6cec0] bg-[#fffdf8] text-[#716b61] hover:border-amber-600 hover:text-amber-700"
            }`}
          >
            <Package size={16} /> Produto
          </button>
        </div>
      </div>

      {activeTab && (
        <form onSubmit={handleSubmit} className="card space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <h2 className="flex items-center gap-2 font-black text-[#25231f]">
              <PackagePlus size={18} /> Novo {activeTab === "servico" ? "Serviço" : "Produto"}
            </h2>
            <p className="mt-1 text-sm font-medium text-[#716b61]">
              Cadastre {activeTab === "servico" ? "serviços" : "produtos"} usados na emissão.
            </p>
          </div>

          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              placeholder={activeTab === "servico" ? "Ex: Honorários mensais" : "Ex: Caderno"}
            />
          </div>

          <div>
            <label className="label">Valor</label>
            <input
              className="input"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="0,00"
            />
          </div>

          {activeTab === "produto" && (
            <div>
              <label className="label">NCM</label>
              <input
                className="input"
                value={form.ncm}
                onChange={(e) => setField("ncm", e.target.value)}
                placeholder="Opcional no MVP"
              />
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Item cadastrado.</p>}

          <button type="submit" disabled={isPending} className="btn-primary w-full">
            {isPending ? "Salvando..." : `Salvar ${activeTab === "servico" ? "serviço" : "produto"}`}
          </button>
        </form>
      )}
    </div>
  );
}

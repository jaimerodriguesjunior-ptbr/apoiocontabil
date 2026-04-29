"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClient } from "@/actions/clientes";
import { Plus, Trash2 } from "lucide-react";

type Service = {
  descricao: string;
  valor_mensal: string;
  codigo_servico: string;
  aliquota_iss: string;
};

type InitialData = {
  id?: string;
  nome?: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  codigo_municipio_ibge?: string;
  client_services?: Array<{
    descricao: string;
    valor_mensal?: number | null;
    codigo_servico?: string | null;
    aliquota_iss?: number | null;
  }>;
};

export default function ClienteForm({ initial }: { initial?: InitialData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: initial?.nome || "",
    cpf_cnpj: initial?.cpf_cnpj || "",
    email: initial?.email || "",
    telefone: initial?.telefone || "",
    logradouro: initial?.logradouro || "",
    numero: initial?.numero || "",
    complemento: initial?.complemento || "",
    bairro: initial?.bairro || "",
    cidade: initial?.cidade || "",
    uf: initial?.uf || "",
    cep: initial?.cep || "",
    codigo_municipio_ibge: initial?.codigo_municipio_ibge || "",
  });

  const [services, setServices] = useState<Service[]>(
    initial?.client_services?.map((s) => ({
      descricao: s.descricao || "",
      valor_mensal: s.valor_mensal != null ? String(s.valor_mensal) : "",
      codigo_servico: s.codigo_servico || "",
      aliquota_iss: s.aliquota_iss != null ? String(s.aliquota_iss) : "",
    })) || []
  );

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setService = (i: number, field: keyof Service, value: string) =>
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const addService = () =>
    setServices((prev) => [...prev, { descricao: "", valor_mensal: "", codigo_servico: "", aliquota_iss: "" }]);

  const removeService = (i: number) => setServices((prev) => prev.filter((_, idx) => idx !== i));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    setError(null);

    startTransition(async () => {
      const result = await saveClient({
        id: initial?.id,
        ...form,
        services: services.map((s) => ({
          descricao: s.descricao,
          valor_mensal: s.valor_mensal ? parseFloat(s.valor_mensal.replace(",", ".")) : null,
          codigo_servico: s.codigo_servico || undefined,
          aliquota_iss: s.aliquota_iss ? parseFloat(s.aliquota_iss) : null,
        })),
      });
      if (result?.error) setError(result.error);
      else router.push("/clientes");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados básicos */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Dados do cliente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} required />
          </div>
          <div>
            <label className="label">CPF / CNPJ</label>
            <input className="input" value={form.cpf_cnpj} onChange={(e) => setField("cpf_cnpj", e.target.value)} placeholder="Somente números" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Endereço <span className="font-normal text-gray-400 text-sm">(opcional)</span></h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label">Logradouro</label>
            <input className="input" value={form.logradouro} onChange={(e) => setField("logradouro", e.target.value)} />
          </div>
          <div>
            <label className="label">Número</label>
            <input className="input" value={form.numero} onChange={(e) => setField("numero", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Bairro</label>
            <input className="input" value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} />
          </div>
          <div>
            <label className="label">CEP</label>
            <input className="input" value={form.cep} onChange={(e) => setField("cep", e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <label className="label">Complemento</label>
            <input className="input" value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Cidade</label>
            <input className="input" value={form.cidade} onChange={(e) => setField("cidade", e.target.value)} />
          </div>
          <div>
            <label className="label">UF</label>
            <input className="input" value={form.uf} onChange={(e) => setField("uf", e.target.value)} maxLength={2} />
          </div>
          <div>
            <label className="label">IBGE Município</label>
            <input className="input" value={form.codigo_municipio_ibge} onChange={(e) => setField("codigo_municipio_ibge", e.target.value)} placeholder="Ex: 4127700" />
          </div>
        </div>
      </div>

      {/* Serviços mensais */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Serviços mensais</h2>
            <p className="text-xs text-gray-400 mt-0.5">Para emissão em lote ou nota recorrente</p>
          </div>
          <button type="button" onClick={addService} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5">
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {services.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum serviço mensal cadastrado.</p>
        )}

        {services.map((s, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="label">Descrição do serviço *</label>
                <input className="input" value={s.descricao} onChange={(e) => setService(i, "descricao", e.target.value)} placeholder="Ex: Honorários contábeis – abril/2026" />
              </div>
              <button type="button" onClick={() => removeService(i)} className="mt-6 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Valor mensal (R$)</label>
                <input className="input" value={s.valor_mensal} onChange={(e) => setService(i, "valor_mensal", e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Cód. serviço</label>
                <input className="input" value={s.codigo_servico} onChange={(e) => setService(i, "codigo_servico", e.target.value)} placeholder="Ex: 14.01" />
              </div>
              <div>
                <label className="label">Alíquota ISS (%)</label>
                <input className="input" type="number" step="0.01" value={s.aliquota_iss} onChange={(e) => setService(i, "aliquota_iss", e.target.value)} placeholder="3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Salvando..." : "Salvar cliente"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

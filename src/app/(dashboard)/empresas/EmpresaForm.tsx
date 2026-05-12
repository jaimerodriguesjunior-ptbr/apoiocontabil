"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAccountantCompany } from "@/actions/empresas";

type InitialCompany = {
  organization?: {
    id?: string;
    name?: string | null;
    document?: string | null;
    module_access?: "nfse" | "nfce" | "nfse_nfce" | null;
    is_blocked?: boolean | null;
    blocked_reason?: string | null;
  } | null;
  companySettings?: Record<string, unknown> | null;
};

function valueFrom(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];
  return value == null ? "" : String(value);
}

export default function EmpresaForm({ initial }: { initial?: InitialCompany }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const settings = initial?.companySettings;
  const organization = initial?.organization;

  const [form, setForm] = useState({
    name: organization?.name || "",
    document: organization?.document || valueFrom(settings, "cnpj"),
    moduleAccess: organization?.module_access || "nfse",
    isBlocked: Boolean(organization?.is_blocked),
    blockedReason: organization?.blocked_reason || "",
    cnpj: valueFrom(settings, "cnpj"),
    razao_social: valueFrom(settings, "razao_social"),
    nome_fantasia: valueFrom(settings, "nome_fantasia"),
    inscricao_municipal: valueFrom(settings, "inscricao_municipal"),
    inscricao_estadual: valueFrom(settings, "inscricao_estadual"),
    regime_tributario: valueFrom(settings, "regime_tributario") || "1",
    codigo_municipio_ibge: valueFrom(settings, "codigo_municipio_ibge") || "4127700",
    cidade: valueFrom(settings, "cidade"),
    uf: valueFrom(settings, "uf") || "PR",
    cep: valueFrom(settings, "cep"),
    logradouro: valueFrom(settings, "logradouro"),
    numero: valueFrom(settings, "numero"),
    complemento: valueFrom(settings, "complemento"),
    bairro: valueFrom(settings, "bairro"),
    email_contato: valueFrom(settings, "email_contato"),
    telefone: valueFrom(settings, "telefone"),
    nfse_login: valueFrom(settings, "nfse_login"),
    nfse_password: valueFrom(settings, "nfse_password"),
    cnae_padrao: valueFrom(settings, "cnae_padrao"),
    codigo_servico_padrao: valueFrom(settings, "codigo_servico_padrao"),
    aliquota_iss_padrao: valueFrom(settings, "aliquota_iss_padrao") || "3",
    environment: valueFrom(settings, "environment") || "production",
  });

  const setField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveAccountantCompany({
        id: organization?.id,
        ...form,
        moduleAccess: form.moduleAccess as "nfse" | "nfce" | "nfse_nfce",
        aliquota_iss_padrao: Number(form.aliquota_iss_padrao.replace(",", ".")) || 3,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push(result.id ? `/empresas/${result.id}` : "/empresas");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card space-y-4">
        <div>
          <h2 className="font-black text-[#25231f]">Dados da empresa</h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">Informações que aparecem para o contador na carteira.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="label">Nome da empresa *</label>
            <input className="input" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input className="input" value={form.document} onChange={(e) => {
              setField("document", e.target.value);
              setField("cnpj", e.target.value);
            }} placeholder="00.000.000/0001-00" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Módulo habilitado</label>
            <select className="input" value={form.moduleAccess} onChange={(e) => setField("moduleAccess", e.target.value)}>
              <option value="nfse">NFSe</option>
              <option value="nfce">NFCe</option>
              <option value="nfse_nfce">NFSe + NFCe</option>
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-[#ded8cc] bg-[#fffdf8] px-3 py-2.5 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isBlocked}
              onChange={(e) => setField("isBlocked", e.target.checked)}
            />
            <span className="text-sm font-bold text-[#25231f]">Bloquear acesso da empresa</span>
          </label>
        </div>

        {form.isBlocked && (
          <div>
            <label className="label">Motivo do bloqueio</label>
            <input className="input" value={form.blockedReason} onChange={(e) => setField("blockedReason", e.target.value)} placeholder="Ex: pendência financeira" />
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-black text-[#25231f]">Configuração fiscal</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Razão social</label>
            <input className="input" value={form.razao_social} onChange={(e) => setField("razao_social", e.target.value)} />
          </div>
          <div>
            <label className="label">Nome fantasia</label>
            <input className="input" value={form.nome_fantasia} onChange={(e) => setField("nome_fantasia", e.target.value)} />
          </div>
          <div>
            <label className="label">Inscrição municipal</label>
            <input className="input" value={form.inscricao_municipal} onChange={(e) => setField("inscricao_municipal", e.target.value)} />
          </div>
          <div>
            <label className="label">Inscrição estadual</label>
            <input className="input" value={form.inscricao_estadual} onChange={(e) => setField("inscricao_estadual", e.target.value)} />
          </div>
          <div>
            <label className="label">Regime tributário</label>
            <select className="input" value={form.regime_tributario} onChange={(e) => setField("regime_tributario", e.target.value)}>
              <option value="1">Simples Nacional</option>
              <option value="2">Lucro Presumido</option>
              <option value="3">Lucro Real</option>
            </select>
          </div>
          <div>
            <label className="label">Ambiente</label>
            <select className="input" value={form.environment} onChange={(e) => setField("environment", e.target.value)}>
              <option value="production">Produção</option>
              <option value="homologation">Homologação</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-black text-[#25231f]">Endereço e município</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">IBGE município</label>
            <input className="input" value={form.codigo_municipio_ibge} onChange={(e) => setField("codigo_municipio_ibge", e.target.value)} />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" value={form.cidade} onChange={(e) => setField("cidade", e.target.value)} />
          </div>
          <div>
            <label className="label">UF</label>
            <input className="input" value={form.uf} onChange={(e) => setField("uf", e.target.value)} maxLength={2} />
          </div>
          <div>
            <label className="label">CEP</label>
            <input className="input" value={form.cep} onChange={(e) => setField("cep", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Logradouro</label>
            <input className="input" value={form.logradouro} onChange={(e) => setField("logradouro", e.target.value)} />
          </div>
          <div>
            <label className="label">Número</label>
            <input className="input" value={form.numero} onChange={(e) => setField("numero", e.target.value)} />
          </div>
          <div>
            <label className="label">Bairro</label>
            <input className="input" value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <label className="label">Complemento</label>
            <input className="input" value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-black text-[#25231f]">NFS-e</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Código de serviço</label>
            <input className="input" value={form.codigo_servico_padrao} onChange={(e) => setField("codigo_servico_padrao", e.target.value)} />
          </div>
          <div>
            <label className="label">CNAE</label>
            <input className="input" value={form.cnae_padrao} onChange={(e) => setField("cnae_padrao", e.target.value)} />
          </div>
          <div>
            <label className="label">Alíquota ISS (%)</label>
            <input className="input" value={form.aliquota_iss_padrao} onChange={(e) => setField("aliquota_iss_padrao", e.target.value)} />
          </div>
          <div>
            <label className="label">Login NFS-e</label>
            <input className="input" value={form.nfse_login} onChange={(e) => setField("nfse_login", e.target.value)} />
          </div>
          <div>
            <label className="label">Senha NFS-e</label>
            <input className="input" type="password" value={form.nfse_password} onChange={(e) => setField("nfse_password", e.target.value)} />
          </div>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Salvando..." : "Salvar empresa"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

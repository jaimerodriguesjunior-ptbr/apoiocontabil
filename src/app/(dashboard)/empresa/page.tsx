"use client";

import { useState, useEffect, useTransition } from "react";
import { getCompany, saveCompany } from "@/actions/empresa";
import { Building2, CheckCircle } from "lucide-react";

const MUNICIPIOS = [
  { ibge: "4127700", label: "Toledo – PR (IBGE 4127700)" },
  { ibge: "4108809", label: "Guaíra – PR (IBGE 4108809)" },
];

export default function EmpresaPage() {
  const [form, setForm] = useState<Record<string, string>>({
    cnpj: "", razao_social: "", nome_fantasia: "", inscricao_municipal: "",
    inscricao_estadual: "", regime_tributario: "1", codigo_municipio_ibge: "4127700",
    cidade: "", uf: "", cep: "", logradouro: "", numero: "", complemento: "",
    bairro: "", email_contato: "", telefone: "", nfse_login: "", nfse_password: "",
    cnae_padrao: "4520007", codigo_servico_padrao: "14.01",
    aliquota_iss_padrao: "3", environment: "production",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getCompany().then((data) => {
      if (data) {
        setForm((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])
          ),
        }));
      }
    });
  }, []);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveCompany({
        ...form,
        aliquota_iss_padrao: parseFloat(form.aliquota_iss_padrao) || 3,
        regime_tributario: form.regime_tributario,
      });
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  const ibgeSelecionado = MUNICIPIOS.find((m) => m.ibge === form.codigo_municipio_ibge);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Building2 size={24} /> Minha Empresa
        </h1>
        <p className="page-subtitle">Dados utilizados na emissão das notas fiscais</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Identificação</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CNPJ *</label>
              <input className="input" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="label">Inscrição Municipal *</label>
              <input className="input" value={form.inscricao_municipal} onChange={(e) => set("inscricao_municipal", e.target.value)} placeholder="Somente números" />
            </div>
          </div>
          <div>
            <label className="label">Razão Social *</label>
            <input className="input" value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
          </div>
          <div>
            <label className="label">Nome Fantasia</label>
            <input className="input" value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Inscrição Estadual</label>
              <input className="input" value={form.inscricao_estadual} onChange={(e) => set("inscricao_estadual", e.target.value)} placeholder="Isento ou número" />
            </div>
            <div>
              <label className="label">Regime Tributário</label>
              <select className="input" value={form.regime_tributario} onChange={(e) => set("regime_tributario", e.target.value)}>
                <option value="1">1 – Simples Nacional</option>
                <option value="2">2 – Lucro Presumido</option>
                <option value="3">3 – Lucro Real</option>
              </select>
            </div>
          </div>
        </div>

        {/* Município */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Município de atuação</h2>
          <div>
            <label className="label">Prefeitura *</label>
            <select className="input" value={form.codigo_municipio_ibge} onChange={(e) => set("codigo_municipio_ibge", e.target.value)}>
              {MUNICIPIOS.map((m) => (
                <option key={m.ibge} value={m.ibge}>{m.label}</option>
              ))}
              <option value="">Outro (informar IBGE manualmente)</option>
            </select>
          </div>
          {!ibgeSelecionado && (
            <div>
              <label className="label">Código IBGE do Município</label>
              <input className="input" value={form.codigo_municipio_ibge} onChange={(e) => set("codigo_municipio_ibge", e.target.value)} placeholder="Ex: 4127700" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CEP</label>
              <input className="input" value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="85900-000" />
            </div>
            <div>
              <label className="label">UF</label>
              <input className="input" value={form.uf} onChange={(e) => set("uf", e.target.value)} placeholder="PR" maxLength={2} />
            </div>
          </div>
          <div>
            <label className="label">Logradouro</label>
            <input className="input" value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Rua / Avenida..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Número</label>
              <input className="input" value={form.numero} onChange={(e) => set("numero", e.target.value)} />
            </div>
            <div>
              <label className="label">Complemento</label>
              <input className="input" value={form.complemento} onChange={(e) => set("complemento", e.target.value)} />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input className="input" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </div>
        </div>

        {/* Contato */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Contato</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email_contato} onChange={(e) => set("email_contato", e.target.value)} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
          </div>
        </div>

        {/* NFS-e */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Configurações NFS-e</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Login NFS-e / Inscrição Municipal</label>
              <input className="input" value={form.nfse_login} onChange={(e) => set("nfse_login", e.target.value)} placeholder="Mesmo que insc. municipal" />
            </div>
            <div>
              <label className="label">Senha NFS-e</label>
              <input className="input" type="password" value={form.nfse_password} onChange={(e) => set("nfse_password", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Código de Serviço padrão</label>
              <input className="input" value={form.codigo_servico_padrao} onChange={(e) => set("codigo_servico_padrao", e.target.value)} placeholder="14.01" />
            </div>
            <div>
              <label className="label">CNAE padrão</label>
              <input className="input" value={form.cnae_padrao} onChange={(e) => set("cnae_padrao", e.target.value)} placeholder="4520007" />
            </div>
            <div>
              <label className="label">Alíquota ISS padrão (%)</label>
              <input className="input" type="number" step="0.01" value={form.aliquota_iss_padrao} onChange={(e) => set("aliquota_iss_padrao", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Ambiente padrão</label>
            <select className="input" value={form.environment} onChange={(e) => set("environment", e.target.value)}>
              <option value="production">Produção</option>
              <option value="homologation">Homologação (testes)</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {success && (
          <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> Dados salvos com sucesso!
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Salvando..." : "Salvar dados"}
        </button>
      </form>
    </div>
  );
}

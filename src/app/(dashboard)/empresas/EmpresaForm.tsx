"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAccountantCompany } from "@/actions/empresas";

type InitialCompany = {
  organization?: {
    id?: string;
    name?: string | null;
    document?: string | null;
    module_access?: string | null;
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
    nfse_password: "",
    nfse_provider: valueFrom(settings, "nfse_provider") || "auto",
    nfse_id_entidade: valueFrom(settings, "nfse_id_entidade"),
    nfse_rps_emissor: valueFrom(settings, "nfse_rps_emissor") || "1",
    nfse_tom_code: valueFrom(settings, "nfse_tom_code") || "7571",
    nfse_cadastro_economico: valueFrom(settings, "nfse_cadastro_economico"),
    cnae_padrao: valueFrom(settings, "cnae_padrao"),
    codigo_servico_padrao: valueFrom(settings, "codigo_servico_padrao"),
    aliquota_iss_padrao: valueFrom(settings, "aliquota_iss_padrao") || "3",
    environment: valueFrom(settings, "environment") || "production",
    nfce_serie: valueFrom(settings, "nfce_serie") || "1",
  });

  const setField = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const resolvedNfseProvider =
    form.nfse_provider !== "auto"
      ? form.nfse_provider
      : form.codigo_municipio_ibge.replace(/\D/g, "") === "4108809"
        ? "guaira-ipm"
        : form.codigo_municipio_ibge.replace(/\D/g, "") === "4127700"
          ? "toledo-equiplano"
          : "";
  const [supportChecklist, setSupportChecklist] = useState<Record<string, boolean>>({});
  const [certificateFileNames, setCertificateFileNames] = useState<Record<"hom" | "prod", string>>({
    hom: "",
    prod: "",
  });

  const toggleChecklist = (id: string) => {
    setSupportChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function buscarCEP(cep: string) {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
          codigo_municipio_ibge: data.ibge || prev.codigo_municipio_ibge,
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP", err);
    }
  }

  function handleCertificateFile(environment: "hom" | "prod", file?: File) {
    if (!file) return;

    if (!/\.(pfx|p12)$/i.test(file.name)) {
      setError("Selecione um certificado A1 nos formatos .pfx ou .p12.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Não foi possível ler o arquivo do certificado.");
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : "";
      if (!base64) {
        setError("Não foi possível converter o certificado para envio.");
        return;
      }

      setField(`nfce_certificate_${environment}_content`, base64);
      setCertificateFileNames((current) => ({ ...current, [environment]: file.name }));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

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
        aliquota_iss_padrao: Number(form.aliquota_iss_padrao.replace(",", ".")) || 3,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.syncError) {
        setError(`Empresa salva, mas a sincronização fiscal falhou: ${result.syncError}`);
        return;
      }

      if (result?.syncWarning) {
        setError(`Empresa salva. ${result.syncWarning}`);
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
          <div className="md:col-span-3">
            <label className="label">Módulos habilitados</label>
            <p className="mb-2 text-xs font-medium text-[#716b61]">Nesta fase, cada empresa pode emitir apenas um tipo de documento fiscal.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "nfse", label: "NFSe" },
                { id: "nfce", label: "NFCe" },
                { id: "nfe", label: "NFe" },
              ].map((m) => {
                const isActive = form.moduleAccess === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setField("moduleAccess", m.id)}
                    className={`flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold transition-all ${
                      isActive
                        ? "border-[#0f766e] bg-[#0f766e] text-white shadow-sm"
                        : "border-[#ebe6dc] bg-white text-[#716b61] hover:border-[#b8afa2]"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-[#ded8cc] bg-[#fffdf8] px-3 py-2.5 md:col-span-3">
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
            <label className="label">Email de contato</label>
            <input
              className="input"
              type="email"
              value={form.email_contato}
              onChange={(e) => setField("email_contato", e.target.value)}
              placeholder="financeiro@empresa.com.br"
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone}
              onChange={(e) => setField("telefone", e.target.value)}
              placeholder="(45) 99999-9999"
            />
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
            <label className="label">CEP</label>
            <input className="input" value={form.cep} onChange={(e) => setField("cep", e.target.value)} onBlur={(e) => buscarCEP(e.target.value)} />
          </div>
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
                <input className="input" type="password" value={form.nfse_password} onChange={(e) => setField("nfse_password", e.target.value)} placeholder="Deixe em branco para manter a senha atual" autoComplete="new-password" />
          </div>
          <div>
            <label className="label">Provedor NFS-e</label>
            <select className="input" value={form.nfse_provider} onChange={(e) => setField("nfse_provider", e.target.value)}>
              <option value="auto">Automático pelo município</option>
              <option value="guaira-ipm">Guaíra / IPM Atende.Net</option>
              <option value="toledo-equiplano">Toledo / Equiplano</option>
            </select>
          </div>
          {resolvedNfseProvider === "toledo-equiplano" && (
            <>
              <div>
                <label className="label">ID da entidade (Toledo)</label>
                <input className="input" value={form.nfse_id_entidade} onChange={(e) => setField("nfse_id_entidade", e.target.value)} required={Boolean(form.nfse_login || form.nfse_password)} />
              </div>
              <div>
                <label className="label">Emissor RPS (Toledo)</label>
                <input className="input" value={form.nfse_rps_emissor} onChange={(e) => setField("nfse_rps_emissor", e.target.value)} />
              </div>
            </>
          )}
          {resolvedNfseProvider === "guaira-ipm" && (
            <>
              <div>
                <label className="label">Código TOM (Guaíra)</label>
                <input className="input" value={form.nfse_tom_code} onChange={(e) => setField("nfse_tom_code", e.target.value)} />
              </div>
              <div>
                <label className="label">Cadastro econômico (Guaíra)</label>
                <input className="input" value={form.nfse_cadastro_economico} onChange={(e) => setField("nfse_cadastro_economico", e.target.value)} placeholder="Usa a inscrição municipal se vazio" />
              </div>
            </>
          )}
          {!resolvedNfseProvider && (form.nfse_login || form.nfse_password) && (
            <p className="md:col-span-3 text-sm font-medium text-amber-700">Este município ainda não possui provedor NFS-e suportado. O cadastro será salvo, mas as credenciais não serão sincronizadas.</p>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-black text-[#25231f]">NFC-e e credenciais do emissor</h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">Os dados são enviados ao emissor local após o salvamento. Ao editar, deixe um segredo em branco para manter o valor atual.</p>
        </div>
        <div>
          <label className="label">Série NFC-e</label>
          <input className="input max-w-xs" value={form.nfce_serie} onChange={(e) => setField("nfce_serie", e.target.value)} />
        </div>
        {([
          { key: "hom", label: "Homologação" },
          { key: "prod", label: "Produção" },
        ] as const).map(({ key, label }) => (
          <div key={key} className="rounded-lg border border-[#ebe6dc] p-4">
            <h3 className="font-bold text-[#25231f]">{label}</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Arquivo do certificado A1 (.pfx ou .p12)</label>
                <input
                  className="input"
                  type="file"
                  accept=".pfx,.p12,application/x-pkcs12"
                  onChange={(event) => handleCertificateFile(key, event.target.files?.[0])}
                />
                <p className="mt-1 text-xs text-[#716b61]">
                  {certificateFileNames[key]
                    ? `Arquivo selecionado: ${certificateFileNames[key]}`
                    : "Deixe em branco para manter o certificado já salvo."}
                </p>
              </div>
              <div>
                <label className="label">Senha do certificado</label>
                <input className="input" type="password" value={form[`nfce_certificate_${key}_password` as keyof typeof form] as string} onChange={(e) => setField(`nfce_certificate_${key}_password`, e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="label">ID do CSC</label>
                <input className="input" value={form[`nfce_csc_${key}_token_id` as keyof typeof form] as string} onChange={(e) => setField(`nfce_csc_${key}_token_id`, e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="label">CSC</label>
                <input className="input" type="password" value={form[`nfce_csc_${key}_code` as keyof typeof form] as string} onChange={(e) => setField(`nfce_csc_${key}_code`, e.target.value)} autoComplete="new-password" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-black text-[#25231f]">Suporte TI</h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">
            Checklist para liberar a empresa para emissao sem erros.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[#ebe6dc] bg-[#fffdf8] p-4">
            <p className="text-sm font-black text-[#25231f]">NFSe</p>
            <div className="mt-3 space-y-2">
              {[
                "Cadastro empresa na Prefeitura em homologacao",
                "Solicitacao de RPS homologacao",
                "Cadastro empresa na Nuvem Fiscal homologacao",
                "Cadastro de lote de RPS Nuvem Fiscal homologacao",
                "Cadastro empresa na Nuvem Fiscal producao",
                "Verificar numero da ultima nota emitida com contador",
                "Cadastro de lote de RPS Nuvem Fiscal producao",
              ].map((item) => {
                const id = `nfse-${item}`;
                return (
                  <label key={id} className="flex items-start gap-2 text-sm text-[#25231f]">
                    <input
                      type="checkbox"
                      checked={Boolean(supportChecklist[id])}
                      onChange={() => toggleChecklist(id)}
                      className="mt-0.5"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#ebe6dc] bg-[#fffdf8] p-4">
            <p className="text-sm font-black text-[#25231f]">NFCe</p>
            <div className="mt-3 space-y-2">
              {[
                "Solicitar UPD Sefaz",
                "Autorizar UPD Sefaz",
              ].map((item) => {
                const id = `nfce-${item}`;
                return (
                  <label key={id} className="flex items-start gap-2 text-sm text-[#25231f]">
                    <input
                      type="checkbox"
                      checked={Boolean(supportChecklist[id])}
                      onChange={() => toggleChecklist(id)}
                      className="mt-0.5"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#ebe6dc] bg-[#fffdf8] p-4">
            <p className="text-sm font-black text-[#25231f]">NFe</p>
            <div className="mt-3 space-y-2">
              {[
                "Solicitar UPD Sefaz",
                "Autorizar UPD Sefaz",
              ].map((item) => {
                const id = `nfe-${item}`;
                return (
                  <label key={id} className="flex items-start gap-2 text-sm text-[#25231f]">
                    <input
                      type="checkbox"
                      checked={Boolean(supportChecklist[id])}
                      onChange={() => toggleChecklist(id)}
                      className="mt-0.5"
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
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

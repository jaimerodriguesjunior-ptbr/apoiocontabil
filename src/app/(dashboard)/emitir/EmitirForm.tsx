"use client";

import { useState, useTransition, useEffect } from "react";
import { emitirNFSe } from "@/actions/fiscal";
import { CheckCircle, AlertCircle } from "lucide-react";

type Client = {
  id: string;
  nome: string;
  cpf_cnpj?: string | null;
  client_services?: Array<{
    descricao: string;
    valor_mensal?: number | null;
    codigo_servico?: string | null;
    aliquota_iss?: number | null;
  }>;
};

type Empresa = {
  codigo_servico_padrao?: string | null;
  aliquota_iss_padrao?: number | null;
  environment?: string | null;
};

export default function EmitirForm({ clientes, empresa }: { clientes: Client[]; empresa: Empresa }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string; invoiceId?: string } | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [codigoServico, setCodigoServico] = useState(empresa.codigo_servico_padrao || "14.01");
  const [aliquota, setAliquota] = useState(String(empresa.aliquota_iss_padrao || "3"));
  const [environment, setEnvironment] = useState(empresa.environment || "production");

  // Preencher campos quando selecionar cliente com serviço cadastrado
  useEffect(() => {
    if (!clienteId) return;
    const cliente = clientes.find((c) => c.id === clienteId);
    const servico = cliente?.client_services?.[0];
    if (servico) {
      if (servico.descricao) setDescricao(servico.descricao);
      if (servico.valor_mensal) setValor(String(servico.valor_mensal));
      if (servico.codigo_servico) setCodigoServico(servico.codigo_servico);
      if (servico.aliquota_iss) setAliquota(String(servico.aliquota_iss));
    }
  }, [clienteId, clientes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) { setResult({ success: false, error: "Selecione um cliente." }); return; }
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) { setResult({ success: false, error: "Informe um valor válido." }); return; }

    setResult(null);
    startTransition(async () => {
      const res = await emitirNFSe({
        clientId: clienteId,
        descricao: descricao.trim(),
        valor: valorNum,
        codigoServico: codigoServico || undefined,
        aliquotaIss: parseFloat(aliquota) || undefined,
        environment: environment as "production" | "homologation",
      });
      setResult({ ...res, invoiceId: res.invoiceId ?? undefined });
      if (res.success) {
        setDescricao("");
        setValor("");
        setClienteId("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div>
        <label className="label">Cliente *</label>
        <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
          <option value="">Selecione um cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}{c.cpf_cnpj ? ` — ${c.cpf_cnpj}` : ""}
            </option>
          ))}
        </select>
        {clientes.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">Nenhum cliente cadastrado. <a href="/clientes/novo" className="underline">Cadastrar agora</a></p>
        )}
      </div>

      <div>
        <label className="label">Descrição do serviço *</label>
        <input
          className="input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          placeholder="Ex: Consultoria contábil – Abril/2026"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Valor (R$) *</label>
          <input
            className="input"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label">Alíquota ISS (%)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={aliquota}
            onChange={(e) => setAliquota(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Código de serviço</label>
        <input
          className="input"
          value={codigoServico}
          onChange={(e) => setCodigoServico(e.target.value)}
          placeholder="Ex: 14.01"
        />
      </div>

      <div>
        <label className="label">Ambiente</label>
        <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="production">Produção</option>
          <option value="homologation">Homologação (testes)</option>
        </select>
      </div>

      {result?.success && (
        <div className="flex items-start gap-2 bg-green-50 text-green-700 px-3 py-3 rounded-lg text-sm">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Nota enviada com sucesso!</p>
            <p className="text-green-600 mt-0.5">A nota está sendo processada pela prefeitura. Acompanhe em <a href="/notas" className="underline">Notas Emitidas</a>.</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-3 rounded-lg text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro ao emitir</p>
            <p className="text-red-600 mt-0.5 whitespace-pre-wrap">{result.error}</p>
          </div>
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
        {isPending ? "Emitindo nota..." : "Emitir NFS-e"}
      </button>
    </form>
  );
}

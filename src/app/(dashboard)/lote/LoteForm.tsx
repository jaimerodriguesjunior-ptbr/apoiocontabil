"use client";

import { useState, useTransition } from "react";
import { emitirNFSe } from "@/actions/fiscal";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Service = {
  id: string;
  descricao: string;
  valor_mensal?: number | null;
  codigo_servico?: string | null;
  aliquota_iss?: number | null;
};

type Client = {
  id: string;
  nome: string;
  cpf_cnpj?: string | null;
  client_services: Service[];
};

type Empresa = {
  environment?: string | null;
  codigo_servico_padrao?: string | null;
  aliquota_iss_padrao?: number | null;
};

type ItemResult = {
  clientId: string;
  serviceId: string;
  status: "pending" | "loading" | "success" | "error";
  error?: string;
};

function getMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Gera opções dos últimos 12 meses + próximo
function getMeses() {
  const meses = [];
  const now = new Date();
  for (let i = -1; i <= 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push(val);
  }
  return meses;
}

export default function LoteForm({ clientes, empresa }: { clientes: Client[]; empresa: Empresa }) {
  const [mes, setMes] = useState(getMesAtual());
  const [environment, setEnvironment] = useState(empresa.environment || "production");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ItemResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const itemKey = (clientId: string, serviceId: string) => `${clientId}::${serviceId}`;

  const toggleItem = (clientId: string, serviceId: string) => {
    const key = itemKey(clientId, serviceId);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === totalItems) {
      setSelected(new Set());
    } else {
      const all = new Set<string>();
      clientes.forEach((c) => c.client_services.forEach((s) => all.add(itemKey(c.id, s.id))));
      setSelected(all);
    }
  };

  // Monta lista plana de itens selecionados
  const allItems: { client: Client; service: Service }[] = [];
  clientes.forEach((c) => c.client_services.forEach((s) => allItems.push({ client: c, service: s })));
  const totalItems = allItems.length;

  const getResult = (clientId: string, serviceId: string) =>
    results.find((r) => r.clientId === clientId && r.serviceId === serviceId);

  async function handleEmitir() {
    const selectedItems = allItems.filter((item) => selected.has(itemKey(item.client.id, item.service.id)));
    if (selectedItems.length === 0) return;

    setIsRunning(true);
    setResults(
      selectedItems.map((item) => ({
        clientId: item.client.id,
        serviceId: item.service.id,
        status: "pending",
      }))
    );

    for (const item of selectedItems) {
      const key = itemKey(item.client.id, item.service.id);

      setResults((prev) =>
        prev.map((r) =>
          r.clientId === item.client.id && r.serviceId === item.service.id
            ? { ...r, status: "loading" }
            : r
        )
      );

      const valor = item.service.valor_mensal;
      if (!valor || valor <= 0) {
        setResults((prev) =>
          prev.map((r) =>
            r.clientId === item.client.id && r.serviceId === item.service.id
              ? { ...r, status: "error", error: "Valor mensal não configurado." }
              : r
          )
        );
        continue;
      }

      const res = await emitirNFSe({
        clientId: item.client.id,
        descricao: item.service.descricao,
        valor,
        codigoServico: item.service.codigo_servico || empresa.codigo_servico_padrao || undefined,
        aliquotaIss: item.service.aliquota_iss ?? empresa.aliquota_iss_padrao ?? undefined,
        environment: environment as "production" | "homologation",
        mesReferencia: mes,
      });

      setResults((prev) =>
        prev.map((r) =>
          r.clientId === item.client.id && r.serviceId === item.service.id
            ? { ...r, status: res.success ? "success" : "error", error: res.error }
            : r
        )
      );
    }

    setIsRunning(false);
  }

  const selectedCount = selected.size;
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Configurações */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Mês de referência</label>
          <select className="input w-48" value={mes} onChange={(e) => setMes(e.target.value)}>
            {getMeses().map((m) => (
              <option key={m} value={m}>{mesLabel(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ambiente</label>
          <select className="input w-48" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="production">Produção</option>
            <option value="homologation">Homologação (testes)</option>
          </select>
        </div>
      </div>

      {/* Resultados gerais */}
      {results.length > 0 && (
        <div className="flex gap-3">
          {successCount > 0 && (
            <span className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full">
              ✓ {successCount} emitida{successCount > 1 ? "s" : ""}
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full">
              ✗ {errorCount} erro{errorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Tabela de clientes */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === totalItems && totalItems > 0}
              onChange={toggleAll}
              className="rounded"
            />
            Selecionar todos ({totalItems})
          </label>
          <span className="text-sm text-gray-500">{selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {clientes.map((client) =>
            client.client_services.map((service) => {
              const key = itemKey(client.id, service.id);
              const isChecked = selected.has(key);
              const r = getResult(client.id, service.id);

              return (
                <div key={key} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${isRunning ? "pointer-events-none" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(client.id, service.id)}
                    disabled={isRunning || r?.status === "success"}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{client.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{service.descricao}</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900 shrink-0">
                    {service.valor_mensal
                      ? service.valor_mensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : <span className="text-amber-500 text-xs">Sem valor</span>}
                  </div>
                  <div className="w-28 text-right shrink-0">
                    {!r && <span className="text-xs text-gray-300">—</span>}
                    {r?.status === "loading" && <Loader2 size={16} className="animate-spin text-blue-500 inline" />}
                    {r?.status === "success" && (
                      <span className="text-xs text-green-600 flex items-center gap-1 justify-end">
                        <CheckCircle size={14} /> Emitida
                      </span>
                    )}
                    {r?.status === "error" && (
                      <span className="text-xs text-red-600 flex items-center gap-1 justify-end" title={r.error}>
                        <AlertCircle size={14} /> Erro
                      </span>
                    )}
                    {r?.status === "pending" && <span className="text-xs text-gray-400">Aguardando...</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botão emitir */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleEmitir}
          disabled={isRunning || selectedCount === 0}
          className="btn-primary flex items-center gap-2"
        >
          {isRunning ? (
            <><Loader2 size={16} className="animate-spin" /> Emitindo...</>
          ) : (
            `Emitir ${selectedCount > 0 ? selectedCount : ""} nota${selectedCount !== 1 ? "s" : ""}`
          )}
        </button>
        {results.length > 0 && !isRunning && (
          <a href="/notas" className="text-sm text-blue-600 hover:underline">
            Ver notas emitidas →
          </a>
        )}
      </div>
    </div>
  );
}

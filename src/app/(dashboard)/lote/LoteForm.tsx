"use client";

import { useEffect, useMemo, useState } from "react";
import { getClientsForBatch, saveClientBatchService } from "@/actions/clientes";
import { emitirNFSe } from "@/actions/fiscal";
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

type BatchService = {
  id?: string;
  descricao?: string | null;
  valor_mensal?: number | null;
};

type Client = {
  id: string;
  nome: string;
  cpf_cnpj?: string | null;
  batch_service?: BatchService | null;
};

type Empresa = {
  environment?: string | null;
};

type Row = {
  client: Client;
  selected: boolean;
  valor: string;
  status: "idle" | "loading" | "success" | "error";
  error?: string;
};

type Step = "selection" | "review";

const PAGE_SIZE = 20;

function moneyFromNumber(value?: number | null) {
  return value ? String(value).replace(".", ",") : "";
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function hasValidCpfOrCnpj(value?: string | null) {
  const doc = onlyDigits(value);

  if (doc.length === 11) {
    if (/^(\d)\1+$/.test(doc)) return false;
    const calc = (slice: string, factor: number) => {
      const total = slice.split("").reduce((sum, digit) => sum + Number(digit) * factor--, 0);
      const rest = (total * 10) % 11;
      return rest === 10 ? 0 : rest;
    };
    return calc(doc.slice(0, 9), 10) === Number(doc[9]) && calc(doc.slice(0, 10), 11) === Number(doc[10]);
  }

  if (doc.length === 14) {
    if (/^(\d)\1+$/.test(doc)) return false;
    const calc = (slice: string, factors: number[]) => {
      const total = slice.split("").reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
      const rest = total % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return (
      calc(doc.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(doc[12]) &&
      calc(doc.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(doc[13])
    );
  }

  return false;
}

function getMeses() {
  const meses = [];
  const now = new Date();

  for (let i = -1; i <= 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return meses;
}

function mesLabel(mes: string) {
  const [year, month] = mes.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function buildRows(clientes: Client[]): Row[] {
  return clientes.map((client) => {
    const valor = moneyFromNumber(client.batch_service?.valor_mensal);

    return {
      client,
      selected: parseMoney(valor) > 0,
      valor,
      status: "idle",
    };
  });
}

export default function LoteForm({
  initialClientes,
  empresa,
  initialMes,
}: {
  initialClientes: Client[];
  empresa: Empresa;
  initialMes: string;
}) {
  const [mes, setMes] = useState(initialMes);
  const [environment, setEnvironment] = useState(empresa.environment || "production");
  const [rows, setRows] = useState<Row[]>(() => buildRows(initialClientes));
  const [step, setStep] = useState<Step>("selection");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMonth() {
      if (mes === initialMes) {
        setRows(buildRows(initialClientes));
        setStep("selection");
        return;
      }

      setIsLoadingMonth(true);
      setFormError(null);
      const clientesData = await getClientsForBatch(mes);
      if (!active) return;
      setRows(buildRows(clientesData.clients as Client[]));
      setStep("selection");
      setPage(1);
      setIsLoadingMonth(false);
    }

    loadMonth().catch((error) => {
      if (!active) return;
      setFormError(error instanceof Error ? error.message : "Nao foi possivel carregar os clientes do mes.");
      setIsLoadingMonth(false);
    });

    return () => {
      active = false;
    };
  }, [initialClientes, initialMes, mes]);

  const selectedRows = rows.filter((row) => row.selected);
  const selectedCount = selectedRows.length;
  const total = selectedRows.reduce((sum, row) => sum + parseMoney(row.valor), 0);
  const successCount = rows.filter((row) => row.status === "success").length;
  const errorCount = rows.filter((row) => row.status === "error").length;

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || row.client.nome.toLowerCase().includes(normalizedQuery);
      const matchesSelected = !onlySelected || row.selected;
      return matchesQuery && matchesSelected;
    });
  }, [onlySelected, query, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showPagination = rows.length > 50;

  const updateRow = (clientId: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row) => (row.client.id === clientId ? { ...row, ...patch } : row)));
  };

  const validateSelected = () => {
    let hasError = false;

    setRows((prev) =>
      prev.map((row) => {
        if (!row.selected) return { ...row, error: undefined };

        const valor = parseMoney(row.valor);
        if (valor <= 0) {
          hasError = true;
          return { ...row, status: "error", error: "Informe um valor maior que zero." };
        }

        if (!hasValidCpfOrCnpj(row.client.cpf_cnpj)) {
          hasError = true;
          return { ...row, status: "error", error: "CPF/CNPJ ausente ou invalido." };
        }

        return { ...row, status: row.status === "success" ? "success" : "idle", error: undefined };
      })
    );

    return !hasError;
  };

  const handleEvaluate = () => {
    setFormError(null);

    if (selectedCount === 0) {
      setFormError("Selecione pelo menos um cliente para avaliar.");
      return;
    }

    if (!validateSelected()) {
      setFormError("Corrija os clientes marcados em vermelho antes de emitir.");
      return;
    }

    setStep("review");
  };

  async function handleEmitir() {
    setFormError(null);

    if (!validateSelected()) {
      setStep("selection");
      setFormError("Corrija os clientes marcados em vermelho antes de emitir.");
      return;
    }

    setIsRunning(true);

    for (const row of selectedRows) {
      if (row.status === "success") continue;

      const valor = parseMoney(row.valor);
      const service = row.client.batch_service;
      const descricao = service?.descricao?.trim() || `Servicos mensais - ${mesLabel(mes)}`;

      updateRow(row.client.id, { status: "loading", error: undefined });

      const saved = await saveClientBatchService({
        clientId: row.client.id,
        descricao,
        valorMensal: valor,
      });

      if (saved?.error) {
        updateRow(row.client.id, { status: "error", error: saved.error });
        continue;
      }

      const res = await emitirNFSe({
        clientId: row.client.id,
        descricao,
        valor,
        environment: environment as "production" | "homologation",
        mesReferencia: mes,
        emissionOrigin: "batch",
      });

      updateRow(row.client.id, {
        status: res.success ? "success" : "error",
        error: res.success ? undefined : res.error,
      });
    }

    setIsRunning(false);
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => row.selected);

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-2 gap-3 p-4">
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-gray-700">Mes de referencia</label>
          <select className="input h-10 px-2 text-sm" value={mes} onChange={(event) => setMes(event.target.value)} disabled={isRunning}>
            {getMeses().map((item) => (
              <option key={item} value={item}>{mesLabel(item)}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-gray-700">Ambiente</label>
          <div className={`inline-flex items-center gap-1.5 rounded-md px-3 h-10 text-xs font-bold ${
            environment === "production" 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {environment === "production" ? "Producao" : "Homologacao"}
          </div>
        </div>
      </div>

      {formError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      {step === "selection" ? (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="space-y-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => {
                      const nextSelected = !allVisibleSelected;
                      setRows((prev) =>
                        prev.map((row) =>
                          visibleRows.some((visible) => visible.client.id === row.client.id)
                            ? { ...row, selected: nextSelected, status: row.status === "success" ? "success" : "idle", error: undefined }
                            : row
                        )
                      );
                    }}
                    disabled={isRunning || isLoadingMonth}
                  />
                  Selecionar visiveis
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} />
                  Somente selecionados
                </label>
              </div>

              <div className="relative min-w-56 flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  className="input pl-9"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar cliente"
                  disabled={isRunning}
                />
              </div>
            </div>

            {isLoadingMonth ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Carregando clientes...
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {visibleRows.map((row) => {
                  const valueMissing = row.selected && parseMoney(row.valor) <= 0;
                  const docInvalid = row.selected && !hasValidCpfOrCnpj(row.client.cpf_cnpj);

                  return (
                    <div key={row.client.id} className="grid grid-cols-[24px_1fr] gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[28px_1fr_180px_160px] sm:items-center">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(event) => updateRow(row.client.id, { selected: event.target.checked, error: undefined, status: row.status === "success" ? "success" : "idle" })}
                        disabled={isRunning || row.status === "success"}
                        className="mt-1 sm:mt-0"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{row.client.nome}</p>
                        <p className={`text-xs ${docInvalid ? "text-red-600" : "text-gray-500"}`}>
                          {row.client.cpf_cnpj || "CPF/CNPJ nao informado"}
                        </p>
                        {row.error && <p className="mt-1 text-xs text-red-600">{row.error}</p>}
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="sr-only">Valor mensal</label>
                        <input
                          className={`input ${valueMissing ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-500" : ""}`}
                          value={row.valor}
                          onChange={(event) => updateRow(row.client.id, { valor: event.target.value, selected: true, error: undefined, status: row.status === "success" ? "success" : "idle" })}
                          placeholder="0,00"
                          disabled={isRunning || row.status === "success"}
                        />
                      </div>

                      <div className="col-span-2 text-sm sm:col-span-1 sm:text-right">
                        {row.status === "success" && <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Emitida</span>}
                        {row.status === "loading" && <span className="inline-flex items-center gap-1 text-blue-600"><Loader2 size={14} className="animate-spin" /> Emitindo</span>}
                        {row.status === "error" && <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle size={14} /> Erro</span>}
                        {row.status === "idle" && row.selected && <span className="text-gray-400">Selecionado</span>}
                      </div>
                    </div>
                  );
                })}

                {visibleRows.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">Nenhum cliente encontrado.</div>
                )}
              </div>
            )}
          </div>

          {showPagination && (
            <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
              <button type="button" className="btn-secondary px-3" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                <ChevronLeft size={16} />
              </button>
              <span>Pagina {page} de {pageCount}</span>
              <button type="button" className="btn-secondary px-3" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page === pageCount}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={handleEvaluate} disabled={isRunning || isLoadingMonth || selectedCount === 0}>
              Continue (avaliar lote)
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card">
              <p className="text-sm text-gray-500">Clientes no lote</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{selectedCount}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Valor total</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Emitidas / erros</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{successCount} / {errorCount}</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
              Clientes selecionados
            </div>
            <div className="divide-y divide-gray-100">
              {selectedRows.map((row) => (
                <div key={row.client.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_160px_170px] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{row.client.nome}</p>
                    <p className="text-xs text-gray-500">{row.client.cpf_cnpj}</p>
                    {row.error && <p className="mt-1 text-xs text-red-600">{row.error}</p>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {parseMoney(row.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-sm sm:text-right">
                    {row.status === "success" && <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Emitida</span>}
                    {row.status === "loading" && <span className="inline-flex items-center gap-1 text-blue-600"><Loader2 size={14} className="animate-spin" /> Emitindo</span>}
                    {row.status === "error" && <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle size={14} /> Erro</span>}
                    {row.status === "idle" && <span className="text-gray-400">Pronta</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep("selection")} disabled={isRunning}>
              Voltar
            </button>
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleEmitir} disabled={isRunning || selectedCount === 0}>
              {isRunning && <Loader2 size={16} className="animate-spin" />}
              {isRunning ? "Emitindo..." : "Emitir lote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

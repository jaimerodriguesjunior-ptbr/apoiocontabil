import { getInvoices } from "@/actions/fiscal";
import { FileText } from "lucide-react";
import NotasFilter from "./NotasFilter";
import NotasList from "./NotasList";

type Nota = {
  id: string;
  client_id?: string | null;
  status?: string | null;
  numero?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  error_message?: string | null;
  data_emissao?: string | null;
  created_at?: string | null;
  descricao_servico?: string | null;
  valor_total?: number | null;
  clients?: { nome?: string | null } | null;
};

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; status?: string; ambiente?: "all" | "production" | "homologation" }>;
}) {
  const params = await searchParams;
  const ambienteAtual = params.ambiente || "production";
  const environment =
    ambienteAtual === "production" || ambienteAtual === "homologation"
      ? ambienteAtual
      : undefined;
  const notas = (await getInvoices({
    mes: params.mes,
    status: params.status,
    environment,
  })) as Nota[];

  const mesAtual = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText size={24} /> Notas Emitidas</h1>
          <p className="page-subtitle">{notas.length} nota{notas.length !== 1 ? "s" : ""} encontrada{notas.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <NotasFilter
        mesAtual={params.mes || mesAtual}
        statusAtual={params.status || ""}
        ambienteAtual={ambienteAtual}
      />

      {notas.length === 0 ? (
        <div className="card py-10 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhuma nota encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <NotasList
          notas={notas}
          mesAtual={params.mes || mesAtual}
          ambienteAtual={ambienteAtual}
        />
      )}
    </div>
  );
}

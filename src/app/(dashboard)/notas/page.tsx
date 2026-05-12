import { getInvoices } from "@/actions/fiscal";
import { FileText } from "lucide-react";
import NotasFilter from "./NotasFilter";
import NotaRow from "./NotaRow";

type Nota = {
  id: string;
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
  searchParams: Promise<{ mes?: string; status?: string }>;
}) {
  const params = await searchParams;
  const notas = (await getInvoices({ mes: params.mes, status: params.status })) as Nota[];

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

      <NotasFilter mesAtual={params.mes || mesAtual} statusAtual={params.status || ""} />

      {notas.length === 0 ? (
        <div className="card text-center py-10">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma nota encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <>
          <div className="card block p-0 overflow-hidden md:hidden">
            {notas.map((nota) => (
              <NotaRow key={nota.id} nota={nota} variant="mobile" />
            ))}
          </div>

          <div className="card hidden p-0 overflow-hidden md:block">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-600">Descrição</th>
                <th className="px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="px-4 py-3 font-medium text-gray-600">Nº NF</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {notas.map((nota) => (
                <NotaRow key={nota.id} nota={nota} variant="desktop" />
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}

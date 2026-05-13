import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getAccountantCompanies } from "@/actions/empresas";

type CompanyRow = {
  id: string;
  name: string;
  document?: string | null;
  module_access?: string | null;
  is_blocked?: boolean | null;
};

const MODULE_LABEL: Record<string, string> = {
  nfse: "NFSe",
  nfce: "NFCe",
  nfe: "NFe",
};

export default async function EmpresasPage() {
  const empresas = (await getAccountantCompanies()) as CompanyRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Carteira do contador</p>
          <h1 className="page-title mt-1 flex items-center gap-2"><Building2 size={24} /> Empresas</h1>
          <p className="page-subtitle">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""} cadastrada{empresas.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/empresas/nova" className="btn-primary">
          <Plus size={16} /> Nova empresa
        </Link>
      </div>

      {empresas.length === 0 ? (
        <div className="card py-12 text-center">
          <Building2 size={36} className="mx-auto mb-3 text-[#b8afa2]" />
          <p className="font-semibold text-[#716b61]">Nenhuma empresa cadastrada ainda.</p>
          <Link href="/empresas/nova" className="btn-primary mt-4">
            <Plus size={16} /> Adicionar primeira empresa
          </Link>
        </div>
      ) : (
        <div className="card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ebe6dc] bg-[#faf8f2] text-left">
                <th className="px-4 py-3 font-bold text-[#625c52]">Empresa</th>
                <th className="px-4 py-3 font-bold text-[#625c52]">CNPJ</th>
                <th className="px-4 py-3 font-bold text-[#625c52]">Módulo</th>
                <th className="px-4 py-3 font-bold text-[#625c52]">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-[#ebe6dc] last:border-0 hover:bg-[#faf8f2]">
                  <td className="px-4 py-3 font-black text-[#25231f]">{empresa.name}</td>
                  <td className="px-4 py-3 font-medium text-[#716b61]">{empresa.document || "-"}</td>
                  <td className="px-4 py-3 font-medium text-[#716b61]">
                    {(empresa.module_access || "nfse")
                      .split("_")
                      .map((m) => MODULE_LABEL[m] || m)
                      .join(" + ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${empresa.is_blocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {empresa.is_blocked ? "Bloqueada" : "Ativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/empresas/${empresa.id}`} className="font-bold text-[#0f766e] hover:text-[#115e59]">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

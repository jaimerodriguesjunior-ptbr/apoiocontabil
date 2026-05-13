import { notFound } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { getAccountantCompany, getDisabledFixedExpenses } from "@/actions/empresas";
import EmpresaForm from "../EmpresaForm";
import UsuarioEmpresaForm from "../UsuarioEmpresaForm";
import ResetSenhaUsuarioForm from "../ResetSenhaUsuarioForm";
import EmpresaTabs from "./EmpresaTabs";
import ConfigDespesasFixas from "./ConfigDespesasFixas";
import WhatsAppButton from "./WhatsAppButton";

type UserRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  cliente_admin: "Admin",
  cliente_usuario: "Usuário",
};

export default async function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, disabledExpenses] = await Promise.all([
    getAccountantCompany(id).catch(() => null),
    getDisabledFixedExpenses(id).catch(() => []),
  ]);

  if (!company) notFound();

  const users = company.users as UserRow[];

  const cadastroContent = (
    <EmpresaForm initial={company} />
  );

  const usuariosContent = (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-black text-[#25231f]"><Users size={18} /> Usuários da empresa</h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">O contador cria o acesso inicial e define a senha.</p>
        </div>

        <UsuarioEmpresaForm organizationId={company.organization.id} />
      </div>

      <div className="card p-0">
        {users.length === 0 ? (
          <p className="p-5 text-sm font-medium text-[#716b61]">Nenhum usuário criado para esta empresa.</p>
        ) : (
          <div className="divide-y divide-[#ebe6dc]">
            {users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#25231f]">{user.full_name || "Usuário sem nome"}</p>
                  <p className="text-xs font-medium text-[#716b61]">{user.email || "Email não informado"}</p>
                  <p className="text-xs font-bold text-[#716b61]">{ROLE_LABEL[user.role || ""] || user.role}</p>
                </div>
                
                <div className="flex flex-1 items-center justify-end gap-3 min-w-0">
                  <span className={`status-pill ${user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
                    {user.is_active ? "Ativo" : "Inativo"}
                  </span>
                  
                  <div className="flex-1 sm:max-w-80 min-w-[200px]">
                    <ResetSenhaUsuarioForm organizationId={company.organization.id} userId={user.id} />
                  </div>

                  {user.role === "cliente_admin" && (
                    <WhatsAppButton fullName={user.full_name || ""} email={user.email || ""} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const configContent = (
    <ConfigDespesasFixas
      organizationId={company.organization.id}
      disabledExpenses={disabledExpenses}
    />
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Detalhe da empresa</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <Building2 size={24} /> {company.organization.name}
          </h1>
          <p className="page-subtitle">Configuração feita pelo contador. Esta área não aparece para os perfis da empresa.</p>
        </div>
        <span className={`status-pill ${company.organization.is_blocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {company.organization.is_blocked ? "Empresa bloqueada" : "Empresa ativa"}
        </span>
      </div>

      <EmpresaTabs
        cadastroContent={cadastroContent}
        usuariosContent={usuariosContent}
        configContent={configContent}
      />
    </div>
  );
}

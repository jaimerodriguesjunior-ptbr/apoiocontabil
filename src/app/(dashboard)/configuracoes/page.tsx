import { Settings, Users } from "lucide-react";
import { getOrgUsers } from "@/actions/empresas";
import { getAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import ResetSenhaForm from "./ResetSenhaForm";
import NovoUsuarioForm from "./NovoUsuarioForm";

type UserRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

const ROLE_LABEL: Record<string, string> = {
  cliente_admin: "Administrador",
  cliente_usuario: "Usuário",
};

export default async function ConfiguracoesPage() {
  const context = await getAuthContext();

  if (context?.role !== "cliente_admin") {
    redirect("/dashboard");
  }

  const users = (await getOrgUsers()) as UserRow[];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings size={22} /> Configurações
        </h1>
        <p className="page-subtitle">Gerencie os acessos da sua empresa.</p>
      </div>

      <NovoUsuarioForm />

      <div className="card space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-black text-[#25231f]">
            <Users size={18} /> Alterar senhas dos usuários
          </h2>
          <p className="mt-1 text-sm font-medium text-[#716b61]">
            Defina uma nova senha para qualquer usuário da empresa.
          </p>
        </div>

        {users.length === 0 ? (
          <p className="text-sm font-medium text-[#716b61]">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <div className="divide-y divide-[#ebe6dc] rounded-lg border border-[#ebe6dc]">
            {users.map((user) => (
              <div key={user.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#25231f]">
                      {user.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs font-medium text-[#716b61]">
                      {user.email || "Email não informado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#a39c90]">
                      {ROLE_LABEL[user.role || ""] || user.role}
                    </span>
                    <span
                      className={`status-pill text-[10px] ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {user.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <ResetSenhaForm userId={user.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

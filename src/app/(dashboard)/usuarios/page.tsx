import { Users } from "lucide-react";
import { getAccountantTeamUsers } from "@/actions/empresas";
import UsuariosContadorClient from "./UsuariosContadorClient";

export default async function UsuariosPage() {
  const users = await getAccountantTeamUsers();
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Administração do escritório</p><h1 className="page-title mt-1 flex items-center gap-2"><Users size={24} /> Usuários contadores</h1><p className="page-subtitle">Crie logins de contador e altere as senhas da equipe.</p></div><UsuariosContadorClient users={users} /></div>;
}

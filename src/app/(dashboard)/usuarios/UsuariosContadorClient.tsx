"use client";

import { useState, useTransition } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAccountantTeamUser, resetAccountantTeamUserPassword } from "@/actions/empresas";

type Accountant = { id: string; full_name: string | null; email: string | null; is_active: boolean | null };

export default function UsuariosContadorClient({ users }: { users: Accountant[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  function create(event: React.FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    startTransition(async () => {
      const result = await createAccountantTeamUser(form);
      if (result?.error) return setError(result.error);
      setForm({ fullName: "", email: "", password: "" }); setMessage("Login de contador criado e vinculado à carteira do escritório."); router.refresh();
    });
  }

  function reset(event: React.FormEvent, userId: string) {
    event.preventDefault(); setError(null); setMessage(null);
    startTransition(async () => {
      const result = await resetAccountantTeamUserPassword({ userId, password: newPassword });
      if (result?.error) return setError(result.error);
      setNewPassword(""); setResetId(null); setMessage("Senha alterada com sucesso.");
    });
  }

  return <div className="space-y-6">
    <section className="card space-y-4"><div><h2 className="flex items-center gap-2 font-black text-[#25231f]"><UserPlus size={18} /> Novo contador</h2><p className="mt-1 text-sm font-medium text-[#716b61]">O novo login terá acesso à mesma carteira de empresas deste escritório.</p></div><form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-end"><div><label className="label">Nome</label><input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></div><div><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div><div><label className="label">Senha inicial</label><input className="input" type="password" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div><button type="submit" disabled={isPending} className="btn-primary">{isPending ? "Criando..." : "Criar login"}</button></form>{message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}</section>
    <section className="card p-0"><div className="border-b border-[#ebe6dc] px-5 py-4"><h2 className="font-black text-[#25231f]">Contadores do escritório</h2><p className="mt-1 text-sm font-medium text-[#716b61]">{users.length} login{users.length === 1 ? "" : "s"} com acesso à carteira.</p></div>{users.length === 0 ? <p className="p-6 text-sm font-medium text-[#716b61]">Nenhum contador encontrado.</p> : <div className="divide-y divide-[#ebe6dc]">{users.map((user) => <div key={user.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-[#25231f]">{user.full_name || "Contador sem nome"}</p><p className="text-sm font-medium text-[#716b61]">{user.email || "E-mail não informado"}</p><p className="mt-1 text-xs font-bold text-[#0f766e]">Contador · {user.is_active ? "Ativo" : "Inativo"}</p></div>{resetId === user.id ? <form onSubmit={(event) => reset(event, user.id)} className="flex gap-2"><input type="password" className="input h-10 min-h-10" placeholder="Nova senha" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoFocus /><button type="submit" disabled={isPending} className="btn-primary h-10">Salvar</button><button type="button" onClick={() => { setResetId(null); setNewPassword(""); }} className="btn-secondary h-10">Cancelar</button></form> : <button type="button" onClick={() => { setError(null); setMessage(null); setResetId(user.id); }} className="btn-secondary"><KeyRound size={15} /> Alterar senha</button>}</div>)}</div>}</section>
  </div>;
}

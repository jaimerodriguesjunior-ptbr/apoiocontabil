"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { adminCreateCompanyUser } from "@/actions/empresas";

export default function NovoUsuarioForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "cliente_usuario" as "cliente_admin" | "cliente_usuario",
  });

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await adminCreateCompanyUser(form);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setForm({ fullName: "", email: "", password: "", role: "cliente_usuario" });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-black text-[#25231f]">
          <UserPlus size={18} /> Novo Usuário
        </h2>
        <p className="mt-1 text-sm font-medium text-[#716b61]">
          Adicione um novo acesso para sua empresa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-[#a39c90]">Nome Completo</label>
            <input
              className="input mt-1"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[#a39c90]">Email</label>
            <input
              className="input mt-1"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="joao@email.com"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[#a39c90]">Senha Inicial</label>
            <input
              className="input mt-1"
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-[#a39c90]">Perfil de Acesso</label>
            <select
              className="input mt-1"
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
            >
              <option value="cliente_usuario">Usuário comum</option>
              <option value="cliente_admin">Administrador (pode gerenciar usuários)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={isPending} className="btn-primary w-full sm:w-auto">
            {isPending ? "Criando..." : "Criar usuário"}
          </button>
          
          {error && <p className="text-xs font-bold text-red-700">{error}</p>}
          {success && <p className="text-xs font-bold text-emerald-700">Usuário criado com sucesso!</p>}
        </div>
      </form>
    </div>
  );
}

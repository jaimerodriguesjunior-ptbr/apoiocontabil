"use client";

import { useState, useTransition } from "react";
import { createCompanyUser } from "@/actions/empresas";

export default function UsuarioEmpresaForm({ organizationId }: { organizationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "cliente_usuario",
  });

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createCompanyUser({
        organizationId,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role as "cliente_admin" | "cliente_usuario",
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setForm({ fullName: "", email: "", password: "", role: "cliente_usuario" });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] md:items-end">
      <div>
        <label className="label">Nome</label>
        <input className="input" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required />
      </div>
      <div>
        <label className="label">Senha inicial</label>
        <input className="input" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required />
      </div>
      <div>
        <label className="label">Perfil</label>
        <select className="input" value={form.role} onChange={(e) => setField("role", e.target.value)}>
          <option value="cliente_usuario">Usuário</option>
          <option value="cliente_admin">Admin</option>
        </select>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Criando..." : "Criar"}
      </button>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 md:col-span-5">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 md:col-span-5">Usuário criado com sucesso.</p>}
    </form>
  );
}

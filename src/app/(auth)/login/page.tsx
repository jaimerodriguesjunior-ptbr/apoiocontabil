"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, Suspense } from "react";
import { login } from "@/actions/auth";

function LoginForm() {
  const [state, action, isPending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get("email") || "";
  // Pega apenas a primeira parte caso o link venha com lixo (ex: espaços ou texto colado)
  const defaultEmail = rawEmail.split(" ")[0];

  return (
    <div className="card">
      <h2 className="mb-6 text-xl font-black text-[#25231f]">Entrar</h2>

      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            defaultValue={defaultEmail}
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm font-medium text-[#716b61]">
        Acesso exclusivo para clientes da Amplotec.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card text-center">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, null);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar</h2>

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
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-blue-600 hover:underline font-medium">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}

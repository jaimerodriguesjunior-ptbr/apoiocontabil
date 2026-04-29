"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";

export default function CadastroPage() {
  const [state, action, isPending] = useActionState(register, null);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Criar conta</h2>

      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="input"
            placeholder="Seu nome"
          />
        </div>

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
            className="input"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
          {isPending ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}

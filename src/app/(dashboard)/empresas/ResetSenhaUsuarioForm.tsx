"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { resetCompanyUserPassword } from "@/actions/empresas";

export default function ResetSenhaUsuarioForm({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await resetCompanyUserPassword({ organizationId, userId, password });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setPassword("");
      setMessage("Senha alterada.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        className="input h-10 min-h-10"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nova senha"
        required
      />
      <button type="submit" disabled={isPending} className="btn-secondary h-10 shrink-0 px-3">
        <KeyRound size={15} />
        {isPending ? "Salvando..." : "Resetar"}
      </button>
      {message && <p className="text-xs font-bold text-emerald-700 sm:self-center">{message}</p>}
      {error && <p className="text-xs font-bold text-red-700 sm:self-center">{error}</p>}
    </form>
  );
}

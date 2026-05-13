"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { adminResetUserPassword } from "@/actions/empresas";

export default function ResetSenhaForm({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await adminResetUserPassword({ userId, password });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setPassword("");
      setMessage("Senha alterada com sucesso!");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        className="input h-10 min-h-10 flex-1"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nova senha (min. 6 caracteres)"
        required
        minLength={6}
      />
      <button type="submit" disabled={isPending} className="btn-secondary h-10 shrink-0 px-3">
        <KeyRound size={15} />
        {isPending ? "Salvando..." : "Alterar"}
      </button>
      {message && <p className="text-xs font-bold text-emerald-700 sm:self-center">{message}</p>}
      {error && <p className="text-xs font-bold text-red-700 sm:self-center">{error}</p>}
    </form>
  );
}

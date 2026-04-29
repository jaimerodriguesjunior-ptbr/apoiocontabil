"use client";

import { useRouter } from "next/navigation";

function getMeses() {
  const meses = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    meses.push({ val, label });
  }
  return meses;
}

export default function NotasFilter({ mesAtual, statusAtual }: { mesAtual: string; statusAtual: string }) {
  const router = useRouter();
  const meses = getMeses();

  function update(mes: string, status: string) {
    const params = new URLSearchParams();
    if (mes) params.set("mes", mes);
    if (status) params.set("status", status);
    router.push(`/notas?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="label">Mês</label>
        <select
          className="input w-48"
          value={mesAtual}
          onChange={(e) => update(e.target.value, statusAtual)}
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m.val} value={m.val}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Status</label>
        <select
          className="input w-44"
          value={statusAtual}
          onChange={(e) => update(mesAtual, e.target.value)}
        >
          <option value="">Todos</option>
          <option value="authorized">Autorizada</option>
          <option value="processing">Processando</option>
          <option value="error">Erro</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>
    </div>
  );
}

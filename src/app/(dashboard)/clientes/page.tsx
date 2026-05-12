import Link from "next/link";
import { getClients } from "@/actions/clientes";
import { Plus, Pencil, Users } from "lucide-react";
import DeleteClientButton from "./DeleteClientButton";

export default async function ClientesPage() {
  const clientes = await getClients();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} /> Clientes</h1>
          <p className="page-subtitle">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/clientes/novo" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo cliente
        </Link>
      </div>

      {clientes.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum cliente cadastrado ainda.</p>
          <Link href="/clientes/novo" className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={16} /> Adicionar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-[#ebe6dc]">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 bg-[#fdfaf3] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#716b61]">
            <div className="col-span-4">Nome</div>
            <div className="col-span-3">CPF / CNPJ</div>
            <div className="col-span-3">Serviço mensal</div>
            <div className="col-span-2 flex justify-end pr-2">Valor mensal</div>
          </div>

          {/* List Body */}
          <div className="divide-y divide-[#ebe6dc]">
            {clientes.map((c: any) => {
              const servicos = c.client_services || [];
              const totalMensal = servicos.reduce((acc: number, s: any) => acc + (s.valor_mensal || 0), 0);
              const servicoDesc = servicos.length > 0 ? servicos[0].descricao : "—";

              return (
                <div key={c.id} className="p-4 md:px-5 md:py-3 flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 md:gap-4 hover:bg-[#fcfbf9] transition-colors">
                  
                  {/* Nome e Acoes (Mobile) */}
                  <div className="flex items-start justify-between md:col-span-4 md:block">
                    <div className="min-w-0 pr-4">
                      <p className="truncate font-black text-[#25231f]">{c.nome}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-[#716b61] md:hidden">
                        {c.cpf_cnpj || "Sem documento"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 md:hidden">
                      <Link href={`/clientes/${c.id}`} className="rounded-md p-2 text-[#716b61] bg-[#f4f0e8] hover:bg-[#ebe6dc] transition-colors">
                        <Pencil size={15} />
                      </Link>
                      <DeleteClientButton id={c.id} nome={c.nome} />
                    </div>
                  </div>

                  {/* CPF/CNPJ (Desktop) */}
                  <div className="hidden md:block md:col-span-3 text-sm font-medium text-[#716b61]">
                    {c.cpf_cnpj || "—"}
                  </div>

                  {/* Servico */}
                  <div className="md:col-span-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a8378] md:hidden">Serviço</p>
                    <p className="truncate text-sm font-medium text-[#25231f]">
                      {servicoDesc}
                      {servicos.length > 1 && <span className="ml-1 font-bold text-[#8a8378]">+{servicos.length - 1}</span>}
                    </p>
                  </div>

                  {/* Valor e Acoes (Desktop) */}
                  <div className="flex items-end justify-between md:col-span-2 md:items-center md:justify-end">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a8378] md:hidden">Valor mensal</p>
                      <p className="font-black text-[#0f766e]">
                        {totalMensal > 0
                          ? totalMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "—"}
                      </p>
                    </div>
                    <div className="hidden md:flex shrink-0 items-center gap-2 ml-4">
                      <Link href={`/clientes/${c.id}`} className="rounded-md p-1.5 text-[#716b61] hover:bg-[#f4f0e8] hover:text-[#0f766e] transition-colors">
                        <Pencil size={15} />
                      </Link>
                      <DeleteClientButton id={c.id} nome={c.nome} />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

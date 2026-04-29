import { getClient } from "@/actions/clientes";
import ClienteForm from "../ClienteForm";
import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EditClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id).catch(() => null);

  if (!client) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Pencil size={24} /> Editar Cliente</h1>
        <p className="page-subtitle">{client.nome}</p>
      </div>
      <ClienteForm initial={client} />
    </div>
  );
}

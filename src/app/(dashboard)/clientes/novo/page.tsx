import ClienteForm from "../ClienteForm";
import { UserPlus } from "lucide-react";

export default function NovoClientePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><UserPlus size={24} /> Novo Cliente</h1>
        <p className="page-subtitle">Preencha os dados e salve</p>
      </div>
      <ClienteForm />
    </div>
  );
}

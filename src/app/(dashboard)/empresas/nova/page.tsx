import { Building2 } from "lucide-react";
import EmpresaForm from "../EmpresaForm";

export default function NovaEmpresaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Carteira do contador</p>
        <h1 className="page-title mt-1 flex items-center gap-2"><Building2 size={24} /> Nova empresa</h1>
        <p className="page-subtitle">Cadastre a empresa e deixe a configuracao fiscal pronta para emissao.</p>
      </div>
      <EmpresaForm />
    </div>
  );
}

import { FileUp } from "lucide-react";
import { getAuthContext } from "@/lib/auth-context";
import { getFiscalModule } from "@/lib/fiscal-modules";
import { redirect } from "next/navigation";
import ImportarXmlForm from "./ImportarXmlForm";

export default async function ImportarXmlPage() {
  const context = await getAuthContext();
  if (getFiscalModule(context?.organization?.module_access) !== "nfe") redirect("/dashboard");
  return <div className="mx-auto max-w-5xl space-y-6"><div><h1 className="page-title flex items-center gap-2"><FileUp size={24} /> Importar XML</h1><p className="page-subtitle">Importe NF-e de entrada para consultar os itens e emitir devolucoes.</p></div><ImportarXmlForm /></div>;
}

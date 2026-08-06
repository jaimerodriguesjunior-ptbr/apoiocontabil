"use server";

import { revalidatePath } from "next/cache";
import { requireFiscalModule } from "@/lib/auth-context";

function getAccessKey(xml: string) {
  const protocolKey = xml.match(/<chNFe>(\d{44})<\/chNFe>/i)?.[1];
  if (protocolKey) return protocolKey;

  return xml.match(/<infNFe[^>]*\bId=["']NFe(\d{44})["']/i)?.[1] || null;
}

export async function queueNFeXmlImport(xmlContent: string, fileName?: string) {
  const context = await requireFiscalModule("nfe");
  const xml = String(xmlContent || "").trim();

  if (!xml || !/<(?:nfeProc|NFe|infNFe)\b/i.test(xml)) {
    return { error: "Selecione um XML de NF-e vÃ¡lido." };
  }

  const chaveAcesso = getAccessKey(xml);
  if (!chaveAcesso) {
    return { error: "NÃ£o foi possÃ­vel localizar a chave de acesso no XML." };
  }

  const { error } = await context.supabase.from("nfe_import_queue").insert({
    organization_id: context.orgId as string,
    chave_acesso: chaveAcesso,
    xml_content: xml,
    metadata: { file_name: fileName || null },
  });

  if (error) {
    if (error.code === "23505") return { error: "Este XML jÃ¡ foi importado." };
    return { error: error.message };
  }

  revalidatePath("/importar-xml");
  return { success: true, chaveAcesso };
}

"use server";

import { createClient } from "@/utils/supabase/server";
import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";
import { revalidatePath } from "next/cache";

async function getOrgId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, orgId: profile?.organization_id as string, userId: user.id };
}

function toMoneyNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value === "string") {
    const compact = value.trim().replace(/\s/g, "");
    const normalized = compact.includes(",")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
  }
  return fallback;
}

function getSaoPauloDate(customDate?: string) {
  let d: Date;

  if (customDate) {
    const [y, m, day] = customDate.split("-").map(Number);
    d = new Date(Date.UTC(y, m - 1, day, 15, 0, 0));
  } else {
    d = new Date();
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  const dCompet = `${year}-${month}-${day}`;

  return {
    dhEmi: `${dCompet}T12:00:00-03:00`,
    dCompet,
    mesReferencia: `${year}-${month}`,
  };
}

type EmitirParams = {
  clientId: string;
  descricao: string;
  valor: number;
  codigoServico?: string;
  cnae?: string;
  aliquotaIss?: number;
  environment?: "production" | "homologation";
  dataCompetencia?: string;
  mesReferencia?: string;
};

export async function emitirNFSe(params: EmitirParams) {
  const { supabase, orgId } = await getOrgId();
  let invoiceId: string | null = null;

  try {
    const {
      clientId,
      descricao,
      valor,
      codigoServico,
      cnae,
      aliquotaIss,
      environment,
      dataCompetencia,
      mesReferencia,
    } = params;

    // Buscar empresa
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .eq("organization_id", orgId)
      .single();

    if (!company) throw new Error("Configure os dados da sua empresa antes de emitir.");

    // Buscar cliente
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("organization_id", orgId)
      .single();

    if (!client) throw new Error("Cliente não encontrado.");

    const env = environment || company.environment || "production";
    const codServico = codigoServico || company.codigo_servico_padrao || "140101";
    const cnaeCode = cnae || company.cnae_padrao || "4520007";
    const aliquota = aliquotaIss ?? company.aliquota_iss_padrao ?? 3.0;
    const totalFinal = Number(toMoneyNumber(valor, 0).toFixed(2));

    if (totalFinal <= 0) throw new Error("Valor deve ser maior que zero.");

    const token = await getNuvemFiscalToken(env);
    const baseUrl =
      env === "production"
        ? process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br"
        : process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br";

    const cnpj = (company.cnpj || company.cpf_cnpj || "").replace(/\D/g, "");
    const inscricaoMunicipal = String(company.inscricao_municipal || company.nfse_login || "")
      .replace(/\D/g, "")
      .trim();

    const ibgeMunicipio = String(company.codigo_municipio_ibge || "4108809").replace(/\D/g, "") || "4108809";
    const isGuaira = ibgeMunicipio === "4108809";
    const isToledo = ibgeMunicipio === "4127700";

    if (!isToledo && !company.nfse_login) {
      throw new Error("Login/senha da prefeitura não configurados. Acesse Minha Empresa.");
    }
    if (isToledo && env === "production" && !inscricaoMunicipal) {
      throw new Error("Inscrição municipal não configurada para Toledo. Acesse Minha Empresa.");
    }

    // Sync empresa Toledo
    if (isToledo && inscricaoMunicipal) {
      const empresaPayload = {
        cpf_cnpj: cnpj,
        nome_razao_social: company.razao_social || company.nome_fantasia || cnpj,
        nome_fantasia: company.nome_fantasia || company.razao_social || cnpj,
        email: company.email_contato || undefined,
        inscricao_estadual: company.inscricao_estadual || undefined,
        inscricao_municipal: inscricaoMunicipal,
        endereco: {
          logradouro: company.logradouro || undefined,
          numero: company.numero || undefined,
          complemento: company.complemento || undefined,
          bairro: company.bairro || undefined,
          codigo_municipio: ibgeMunicipio,
          cidade: company.cidade || undefined,
          uf: company.uf || undefined,
          cep: String(company.cep || "").replace(/\D/g, "") || undefined,
          pais: "BRASIL",
        },
        regime_tributario: Number(company.regime_tributario) || 1,
      };

      try {
        const syncPut = await fetch(`${baseUrl}/empresas/${cnpj}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(empresaPayload),
        });
        if (!syncPut.ok && syncPut.status === 404) {
          await fetch(`${baseUrl}/empresas`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(empresaPayload),
          });
        }
      } catch (e) {
        console.warn("[emitirNFSe] Sync Toledo ignorado:", e);
      }
    }

    const { dhEmi, dCompet, mesReferencia: mesAuto } = getSaoPauloDate(dataCompetencia);

    const getCodigoNacional = (raw: string) => {
      const digits = raw.replace(/[.-]/g, "");
      if (isToledo) {
        return digits.length >= 4 ? `${digits.substring(0, 2)}.${digits.substring(2, 4)}` : "14.01";
      }
      if (isGuaira) {
        if (digits.length >= 6) return digits.substring(0, 6);
        if (digits.length === 4) return `${digits}01`;
        return digits;
      }
      if (digits.length >= 4) return `${digits.substring(0, 2)}.${digits.substring(2, 4)}`;
      return digits;
    };

    const getCodigoMunicipal = (raw: string) => {
      const digits = raw.replace(/[.-]/g, "");
      if (isToledo) {
        if (digits.length >= 9) return `${digits.substring(0, 2)}.${digits.substring(2, 4)}.${digits.substring(4, 6)}.${digits.substring(6, 9)}`;
        if (digits.length === 6) return `${digits.substring(0, 2)}.${digits.substring(2, 4)}.${digits.substring(4, 6)}.000`;
        if (digits.length === 4) return `${digits.substring(0, 2)}.${digits.substring(2, 4)}.01.000`;
        return "14.01.01.000";
      }
      if (digits.length >= 6) return digits.substring(0, 6);
      if (digits.length === 4 && ibgeMunicipio === "4108809" && digits === "1401") return "140101";
      return digits;
    };

    const normalizeMunicipio = (codigo?: string | number) => {
      if (!codigo) return ibgeMunicipio;
      const raw = String(codigo).replace(/\D/g, "");
      return raw || ibgeMunicipio;
    };

    // Tomador (cliente)
    const cleanDoc = (client.cpf_cnpj || "").replace(/\D/g, "");
    let blockEnd = undefined;
    if (client.logradouro && client.cep) {
      const cleanCep = client.cep.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        blockEnd = {
          xLgr: client.logradouro,
          nro: client.numero || "SN",
          xBairro: client.bairro || "Centro",
          endNac: {
            cMun: normalizeMunicipio(client.codigo_municipio_ibge),
            CEP: cleanCep,
          },
        };
      }
    }

    const descClean = descricao.replace(/(\s*\(R\$\s*[\d.,]+\))+\s*$/, "").trimEnd();
    const xDescServ = `${descClean} (R$ ${totalFinal.toFixed(2)})`;

    const dpsPayload = {
      ambiente: env === "production" ? "producao" : "homologacao",
      infDPS: {
        dhEmi,
        dCompet,
        prest: { CNPJ: cnpj },
        toma: {
          CNPJ: cleanDoc.length > 11 ? cleanDoc : undefined,
          CPF: cleanDoc.length > 0 && cleanDoc.length <= 11 ? cleanDoc : undefined,
          xNome: client.nome,
          email: client.email || undefined,
          fone: client.telefone?.replace(/\D/g, "") || undefined,
          end: blockEnd,
        },
        serv: {
          cServ: {
            cTribNac: getCodigoNacional(codServico.replace(/[.-]/g, "")),
            cTribMun: getCodigoMunicipal(codServico.replace(/[.-]/g, "")),
            CNAE: cnaeCode,
            cSitTrib: "0",
            xDescServ,
          },
          locPrest: { cLocPrestacao: ibgeMunicipio },
        },
        valores: {
          vServPrest: { vServ: totalFinal },
          trib: {
            tribMun: {
              tribISSQN: 1,
              tpRetISSQN: 1,
              pAliq: aliquota,
              vISSQN: isToledo ? undefined : 0,
              cLocIncid: ibgeMunicipio,
            },
          },
        },
      },
    };

    // Salvar rascunho
    const { data: invoice, error: dbError } = await supabase
      .from("fiscal_invoices")
      .insert({
        organization_id: orgId,
        client_id: clientId,
        tipo_documento: "NFSe",
        status: "processing",
        environment: env,
        valor_total: totalFinal,
        descricao_servico: descricao,
        codigo_servico: codServico,
        cnae: cnaeCode,
        aliquota_iss: aliquota,
        data_emissao: dhEmi,
        mes_referencia: mesReferencia || mesAuto,
        payload_json: dpsPayload,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    invoiceId = invoice.id;

    // Enviar para NuvemFiscal
    const response = await fetch(`${baseUrl}/nfse/dps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(dpsPayload),
    });

    const responseText = await response.text();
    let result: any = {};
    try { result = JSON.parse(responseText); } catch { result = {}; }

    if (!response.ok) {
      const errorDetails = result.error?.message || JSON.stringify(result);
      const fullErrorString = JSON.stringify(result);
      const normalized = `${errorDetails} ${fullErrorString}`.toLowerCase();

      const isToledoCredentialIssue =
        (normalized.includes("1824") && normalized.includes("nrinscricaomunicipal")) ||
        normalized.includes("8003");

      if (isToledo && env === "production" && isToledoCredentialIssue) {
        await supabase.from("fiscal_invoices").update({ status: "error", error_message: fullErrorString }).eq("id", invoiceId);
        return {
          success: false,
          error: `Erro Toledo: ${errorDetails}\nVerifique na Nuvem Fiscal o cadastro da empresa e configuração NFS-e (login/IM).`,
        };
      }

      // Auto-retry erro 00229 (endereço já cadastrado)
      if (fullErrorString.includes("229") || (fullErrorString.includes("cadastr") && fullErrorString.includes("endere"))) {
        console.log("[NFSe] Erro 00229 detectado. Reenviando sem endereço...");
        if (dpsPayload.infDPS.toma.end) {
          delete (dpsPayload.infDPS.toma as any).end;
          const retry = await fetch(`${baseUrl}/nfse/dps`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(dpsPayload),
          });
          if (retry.ok) {
            const retryResult = await retry.json();
            result = retryResult;
          } else {
            const retryErr = JSON.stringify(await retry.json());
            await supabase.from("fiscal_invoices").update({ status: "error", error_message: retryErr }).eq("id", invoiceId);
            return { success: false, error: `Erro NuvemFiscal (retry falhou): ${retryErr}` };
          }
        } else {
          await supabase.from("fiscal_invoices").update({ status: "error", error_message: fullErrorString }).eq("id", invoiceId);
          return { success: false, error: `Erro NuvemFiscal: ${errorDetails}` };
        }
      } else {
        await supabase.from("fiscal_invoices").update({ status: "error", error_message: fullErrorString }).eq("id", invoiceId);
        return { success: false, error: `Erro NuvemFiscal: ${errorDetails}` };
      }
    }

    // Sucesso
    await supabase
      .from("fiscal_invoices")
      .update({
        status: "processing",
        nuvemfiscal_uuid: result.id,
        numero: result.numero,
        serie: result.serie,
        payload_json: dpsPayload,
      })
      .eq("id", invoiceId);

    revalidatePath("/notas");
    return { success: true, invoiceId };
  } catch (error: any) {
    console.error("[emitirNFSe] Erro:", error);
    if (invoiceId) {
      const supabase2 = await createClient();
      await supabase2.from("fiscal_invoices").update({ status: "error", error_message: error.message }).eq("id", invoiceId);
    }
    return { success: false, error: error.message };
  }
}

export async function consultarNFSe(invoiceId: string) {
  const { supabase, orgId } = await getOrgId();

  const { data: invoice } = await supabase
    .from("fiscal_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .single();

  if (!invoice || !invoice.nuvemfiscal_uuid) {
    return { success: false, error: "Nota não encontrada ou sem ID da NuvemFiscal." };
  }

  const env = (invoice.environment as "production" | "homologation") || "production";
  const token = await getNuvemFiscalToken(env);
  const baseUrl =
    env === "production"
      ? process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br"
      : process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br";

  const response = await fetch(`${baseUrl}/nfse/${invoice.nuvemfiscal_uuid}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const err = await response.json();
    return { success: false, error: err.error?.message || "Erro ao consultar." };
  }

  const result = await response.json();

  let novoStatus = invoice.status;
  let errorMessage = null;

  if (result.status === "autorizado" || result.status === "autorizada") novoStatus = "authorized";
  else if (["erro", "rejeitado", "negado"].includes(result.status)) {
    novoStatus = "error";
    if (result.mensagens?.length) {
      errorMessage = result.mensagens.map((m: any) => `${m.codigo}: ${m.descricao}`).join(" | ");
    } else {
      errorMessage = result.motivo_status || JSON.stringify(result);
    }
  } else if (result.status === "cancelado") novoStatus = "cancelled";

  const updateData: Record<string, any> = {
    status: novoStatus,
    numero: result.numero,
    serie: result.serie,
    chave_acesso: result.chave || result.codigo_verificacao,
    xml_url: result.xml_url,
    pdf_url: result.pdf_url || result.link_url,
    error_message: errorMessage,
    updated_at: new Date().toISOString(),
  };

  if (novoStatus === "authorized" && result.xml_url && !invoice.xml_content) {
    try {
      const xmlRes = await fetch(result.xml_url);
      if (xmlRes.ok) updateData.xml_content = await xmlRes.text();
    } catch { /* continua sem XML local */ }
  }

  await supabase.from("fiscal_invoices").update(updateData).eq("id", invoiceId);

  revalidatePath("/notas");
  return { success: true, status: novoStatus, data: result };
}

export async function getInvoices(filters?: { mes?: string; status?: string; clientId?: string }) {
  const { supabase, orgId } = await getOrgId();

  let query = supabase
    .from("fiscal_invoices")
    .select(`*, clients(nome, cpf_cnpj)`)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (filters?.mes) query = query.eq("mes_referencia", filters.mes);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);

  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data || [];
}

export async function getDashboardStats() {
  const { supabase, orgId } = await getOrgId();

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [{ count: totalClientes }, { data: notasMes }] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("ativo", true),
    supabase
      .from("fiscal_invoices")
      .select("valor_total, status")
      .eq("organization_id", orgId)
      .eq("mes_referencia", mesAtual),
  ]);

  const notasAutorizadas = (notasMes || []).filter((n) => n.status === "authorized");
  const totalFaturado = notasAutorizadas.reduce((acc, n) => acc + (n.valor_total || 0), 0);

  return {
    totalClientes: totalClientes || 0,
    notasNoMes: (notasMes || []).length,
    totalFaturado,
    mesAtual,
  };
}

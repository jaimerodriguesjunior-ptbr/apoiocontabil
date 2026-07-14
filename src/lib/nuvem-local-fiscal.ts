import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";

type CompanyFiscalData = {
  organizationId: string;
  cnpj?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  inscricaoMunicipal?: string | null;
  inscricaoEstadual?: string | null;
  regimeTributario?: string | null;
  codigoMunicipioIbge?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  email?: string | null;
  nfseLogin?: string | null;
  nfsePassword?: string | null;
  nfseProvider?: string | null;
  nfseIdEntidade?: string | null;
  nfseRpsEmissor?: string | null;
  nfseTomCode?: string | null;
  nfseEconomicRegistration?: string | null;
  cnaePadrao?: string | null;
  codigoServicoPadrao?: string | null;
  aliquotaIssPadrao?: number | null;
  nfceSerie?: string | null;
  nfceCscHomTokenId?: string | null;
  nfceCscHomCode?: string | null;
  nfceCscProdTokenId?: string | null;
  nfceCscProdCode?: string | null;
  nfceCertificateHomContent?: string | null;
  nfceCertificateHomPassword?: string | null;
  nfceCertificateProdContent?: string | null;
  nfceCertificateProdPassword?: string | null;
};

type SyncResult =
  | { status: "success" }
  | { status: "partial"; message: string }
  | { status: "error"; message: string };

function cleanCnpj(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function baseUrl() {
  return (process.env.NUVEMFISCAL_PROD_URL || "").replace(/\/+$/, "");
}

function resolveNfseProvider(provider: string | null | undefined, municipalityCode: string | null | undefined) {
  const selected = (provider || "").trim().toLowerCase();
  const municipality = (municipalityCode || "").replace(/\D/g, "");
  if (selected === "guaira-ipm" || selected === "toledo-equiplano") return selected;
  if (municipality === "4108809") return "guaira-ipm";
  if (municipality === "4127700") return "toledo-equiplano";
  return null;
}

async function requestLocalFiscal(
  url: string,
  token: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>
) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (response.ok) return;

  let message = `Falha na API fiscal (${response.status}).`;
  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      message = payload.message;
    }
  } catch {
    // Nunca inclui o corpo da resposta: ele pode conter dados fiscais sensíveis.
  }
  throw new Error(message);
}

export async function syncCompanyWithLocalFiscal(data: CompanyFiscalData): Promise<SyncResult> {
  const cnpj = cleanCnpj(data.cnpj);
  const url = baseUrl();

  if (cnpj.length !== 14) {
    return { status: "error", message: "Informe um CNPJ válido para sincronizar com o emissor." };
  }
  if (!url) {
    return { status: "error", message: "URL do emissor fiscal não configurada." };
  }

  try {
    const token = await getNuvemFiscalToken("production");
    await requestLocalFiscal(`${url}/empresas/${cnpj}`, token, "PUT", {
      externalCompanyId: data.organizationId,
      cpf_cnpj: cnpj,
      nome_razao_social: data.razaoSocial,
      nome_fantasia: data.nomeFantasia,
      inscricao_municipal: data.inscricaoMunicipal,
      inscricao_estadual: data.inscricaoEstadual,
      regime_tributario: data.regimeTributario,
      email: data.email,
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        codigo_municipio: data.codigoMunicipioIbge,
        cidade: data.cidade,
        uf: data.uf,
        cep: data.cep,
      },
    });

    const environments = [
      {
        ambiente: "homologacao",
        cscId: data.nfceCscHomTokenId,
        csc: data.nfceCscHomCode,
        certificate: data.nfceCertificateHomContent,
        certificatePassword: data.nfceCertificateHomPassword,
      },
      {
        ambiente: "producao",
        cscId: data.nfceCscProdTokenId,
        csc: data.nfceCscProdCode,
        certificate: data.nfceCertificateProdContent,
        certificatePassword: data.nfceCertificateProdPassword,
      },
    ] as const;

    const nfseProvider = resolveNfseProvider(data.nfseProvider, data.codigoMunicipioIbge);
    const hasNfseCredentials = Boolean(data.nfseLogin && data.nfsePassword);

    for (const environment of environments) {
      if (environment.cscId && environment.csc) {
        await requestLocalFiscal(`${url}/empresas/${cnpj}/nfce`, token, "PUT", {
          ambiente: environment.ambiente,
          sefaz: { id_csc: environment.cscId, csc: environment.csc, serie: data.nfceSerie },
        });
      }

      if (hasNfseCredentials && nfseProvider) {
        const providerPayload =
          nfseProvider === "toledo-equiplano"
            ? {
                equiplano: {
                  inscricao_municipal: data.inscricaoMunicipal,
                  id_entidade: data.nfseIdEntidade,
                },
                rps: { emissor: data.nfseRpsEmissor || "1" },
              }
            : {
                ipm: {
                  codigo_tom: data.nfseTomCode || "7571",
                  cadastro_economico: data.nfseEconomicRegistration || data.inscricaoMunicipal,
                  codigo_atividade: data.cnaePadrao,
                },
              };

        await requestLocalFiscal(`${url}/empresas/${cnpj}/nfse`, token, "PUT", {
          ambiente: environment.ambiente,
          provedor: nfseProvider,
          prefeitura: { login: data.nfseLogin, senha: data.nfsePassword },
          municipio: { codigo_ibge: data.codigoMunicipioIbge, cidade: data.cidade },
          inscricao_municipal: data.inscricaoMunicipal,
          servico: {
            codigo: data.codigoServicoPadrao,
            aliquota_iss: data.aliquotaIssPadrao,
            codigo_atividade: data.cnaePadrao,
          },
          ...providerPayload,
        });
      }
    }

    // O emissor local mantém um certificado A1 por CNPJ. Em caso de ambos preenchidos,
    // o de homologação é a fonte preferida para evitar sobrescrever sem necessidade.
    const certificate = environments.find((item) => item.certificate && item.certificatePassword);
    if (certificate) {
      await requestLocalFiscal(`${url}/empresas/${cnpj}/certificado`, token, "PUT", {
        fileName: "certificado.pfx",
        pfxBase64: certificate.certificate,
        password: certificate.certificatePassword,
      });
    }

    if (hasNfseCredentials && !nfseProvider) {
      return {
        status: "partial",
        message: "Cadastro sincronizado, mas a NFS-e não foi configurada: o município ainda não possui provedor suportado no emissor local.",
      };
    }

    return { status: "success" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar com o emissor fiscal.";
    console.error("[LocalFiscal] Falha na sincronização da empresa:", message);
    return { status: "error", message };
  }
}

"use server";

import { createClient } from "@/utils/supabase/server";

type CompanyData = {
    cpf_cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    inscricao_estadual: string;
    inscricao_municipal: string;
    regime_tributario: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigo_municipio_ibge: string;
    cidade: string;
    uf: string;
    cep: string;
    email_contato: string;
    telefone: string;
    aliquota_iss?: string;
    codigo_servico?: string;
};

export async function registerCompanyInFocusNFe(data: CompanyData) {
    const supabase = await createClient();

    try {
        if (!data.cpf_cnpj || !data.razao_social || !data.logradouro || !data.codigo_municipio_ibge) {
            throw new Error("Dados obrigatórios faltando (CNPJ, Razão Social, Endereço, IBGE).");
        }

        const principalToken = process.env.FOCUSNFE_PRINCIPAL;
        if (!principalToken) {
            throw new Error("Token principal da Focus NFe não configurado (.env.local).");
        }
        const authHeader = 'Basic ' + Buffer.from(principalToken + ':').toString('base64');
        const cnpjClean = data.cpf_cnpj.replace(/\D/g, "");

        // 1. Save locally to Supabase
        const upsertData: any = {
            cnpj: data.cpf_cnpj,
            razao_social: data.razao_social,
            nome_fantasia: data.nome_fantasia,
            inscricao_estadual: data.inscricao_estadual,
            inscricao_municipal: data.inscricao_municipal,
            regime_tributario: data.regime_tributario,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            codigo_municipio_ibge: data.codigo_municipio_ibge,
            cidade: data.cidade,
            uf: data.uf,
            cep: data.cep,
            email_contato: data.email_contato,
            telefone: data.telefone,
            aliquota_iss: data.aliquota_iss ? Number(data.aliquota_iss) : 0,
            codigo_servico: data.codigo_servico || '2.01'
        };

        const { error: dbError } = await supabase
            .from("company_settings")
            .upsert(upsertData, { onConflict: 'cnpj' });

        if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

        // 2. Configure in Focus NFe
        console.log(`[FocusNFe] Cadastrando/Atualizando empresa ${cnpjClean}...`);

        const focusPayload = {
            cnpj: cnpjClean,
            nome: data.razao_social,
            nome_fantasia: data.nome_fantasia,
            inscricao_municipal: data.inscricao_municipal,
            inscricao_estadual: data.inscricao_estadual || undefined,
            telefone: data.telefone.replace(/\D/g, ""),
            email: data.email_contato,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento || undefined,
            bairro: data.bairro,
            cep: data.cep.replace(/\D/g, ""),
            municipio: data.cidade,
            uf: data.uf,
            // As vezes a Focus pede o IBGE no cadastro tambem, mas as vezes o nome da erro se nao bater. Mando ambos por seguranca.
            codigo_municipio: data.codigo_municipio_ibge.replace(/\D/g, ""),
            enviar_email_destinatario: true
        };

        const url = "https://api.focusnfe.com.br/v2/empresas";

        // Let's first try to create or update (POST handles creation)
        // Focus NFe API v2 creates a new company with POST.
        // If it already exists, it might return an error, but let's see exactly what it returns first.
        let res = await fetch(url + `?dry_run=0`, { // Ensure it's not a dry run
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(focusPayload)
        });

        if (!res.ok) {
            const errorBody = await res.json();

            // If it's a validation error (e.g. 422 Unprocessable Entity), don't try to PUT, just show the error!
            if (res.status === 422 || res.status === 400 || errorBody.codigo !== "empresa_ja_cadastrada") {
                console.error(`[FocusNFe] Erro de validação no POST (${res.status}):`, errorBody);
                throw new Error(JSON.stringify(errorBody));
            }

            // ONLY try updating if it already exists (PUT)
            console.log(`[FocusNFe] Empresa já cadastrada, tentando atualizar (PUT)...`);
            res = await fetch(`${url}/${cnpjClean}`, {
                method: "PUT",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(focusPayload)
            });

            if (!res.ok) {
                const putErrorData = await res.json();
                console.error(`[FocusNFe] Erro na API (PUT):`, putErrorData);
                throw new Error(JSON.stringify(putErrorData));
            }
        }

        const focusResponse = await res.json();
        console.log(`[FocusNFe] Cadastro submetido. Resposta:`, focusResponse);

        // Verification: Try to fetch it immediately
        console.log(`[FocusNFe] Verificando existência da empresa no banco da Focus...`);
        const resVerify = await fetch(`${url}/${cnpjClean}`, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            }
        });

        if (resVerify.ok) {
            const verifyData = await resVerify.json();
            console.log(`[FocusNFe] Confirmação! Empresa encontrada na API de consulta. UUID: ${verifyData.id}`);
        } else {
            console.warn(`[FocusNFe] Alerta: Empresa não encontrada na consulta logo após o cadastro (${resVerify.status}).`);
        }

        return { success: true };
    } catch (error: any) {
        console.error("registerCompanyInFocusNFe error:", error);
        return { success: false, error: error.message || "Erro desconhecido" };
    }
}

export async function emitNfseFocus(data: any, environment: 'production' | 'homologation') {
    try {
        const token = environment === 'production'
            ? process.env.FOCUSNFE_PROD_TOKEN
            : process.env.FOCUSNFE_HOM_TOKEN;

        if (!token) {
            throw new Error(`Token Focus NFe (Emissão) não configurado para o ambiente: ${environment}.`);
        }

        const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');
        const url = environment === 'production'
            ? 'https://api.focusnfe.com.br/v2/nfse'
            : 'https://homologacao.focusnfe.com.br/v2/nfse';

        // Focus NFe v2 Payload Structure — based on official Toledo/PR guide
        // https://focusnfe.com.br/guides/nfse/municipios-integrados/toledo-pr/
        const valorServicos = Number(data.servico.valor_servicos) || 0;
        const aliquota = Number(data.aliquota_iss) || 0;
        const valorIss = aliquota > 0 ? Number((valorServicos * aliquota / 100).toFixed(2)) : 0;

        // Toledo uses 4-digit service code without dots (e.g. "2.01" -> "0201")
        const rawCode = data.servico.codigo_servico?.replace(/[^\d]/g, '') || '';
        const itemListaServico = rawCode.padStart(4, '0');

        const focusPayload: any = {
            data_emissao: new Date().toISOString(),
            natureza_operacao: "1", // 1 - Tributação no município
            prestador: {
                cnpj: data.cnpj.replace(/\D/g, ""),
                inscricao_municipal: data.inscricao_municipal,
                codigo_municipio: Number(data.codigo_municipio?.replace(/\D/g, ""))
            },
            tomador: {
                cnpj: data.tomador.cpf_cnpj?.replace(/\D/g, "")?.length === 14 ? data.tomador.cpf_cnpj.replace(/\D/g, "") : undefined,
                cpf: data.tomador.cpf_cnpj?.replace(/\D/g, "")?.length === 11 ? data.tomador.cpf_cnpj.replace(/\D/g, "") : undefined,
                razao_social: data.tomador.razao_social,
                email: data.tomador.email,
                telefone: data.tomador.telefone,
                endereco: {
                    logradouro: data.tomador.endereco.logradouro,
                    numero: data.tomador.endereco.numero,
                    bairro: data.tomador.endereco.bairro,
                    codigo_municipio: Number(data.tomador.endereco.codigo_municipio?.replace(/\D/g, "")),
                    uf: data.tomador.endereco.uf,
                    cep: data.tomador.endereco.cep?.replace(/\D/g, "")
                }
            },
            servico: {
                aliquota: aliquota,
                valor_servicos: valorServicos,
                base_calculo: valorServicos,
                valor_iss: valorIss,
                iss_retido: false,
                item_lista_servico: itemListaServico,
                discriminacao: data.servico.discriminacao
            }
        };

        if (data.numero_rps) focusPayload.numero_rps = data.numero_rps;
        if (data.serie_rps) focusPayload.serie_rps = data.serie_rps;

        const referencia = data?.ref || `NFT_${Date.now()}`;
        const params = new URLSearchParams();
        params.append('ref', referencia);
        // Enable dry_run only when explicitly requested.
        if (data?.dry_run === true) params.append('dry_run', '1');

        console.log(`[FocusNFe Emission] Enviando para ${environment} (Ref: ${referencia}):`, JSON.stringify(focusPayload, null, 2));

        const res = await fetch(`${url}?${params.toString()}`, {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(focusPayload)
        });

        const contentType = res.headers.get("content-type");
        let responseData;
        if (contentType && contentType.includes("application/json")) {
            responseData = await res.json();
            if (!responseData?.ref && responseData?.referencia) {
                responseData.ref = responseData.referencia;
            }
            if (!responseData?.ref) {
                responseData.ref = referencia;
            }
        } else {
            const rawText = await res.text();
            throw new Error(`API retornou HTML ou texto puro (${res.status}): ${rawText.substring(0, 100)}...`);
        }

        if (!res.ok) {
            console.error(`[FocusNFe Emission] Erro (${res.status}):`, responseData);
            return { success: false, error: JSON.stringify(responseData) };
        }

        console.log(`[FocusNFe Emission] Sucesso (Referência):`, responseData.referencia);
        // Best effort: query the same ref immediately to enrich response with status/XML.
        const consulta = await consultarNfseFocus(referencia, environment);
        if (consulta.success && consulta.data) {
            return {
                success: true,
                data: {
                    ...responseData,
                    ...consulta.data
                }
            };
        }

        return { success: true, data: responseData };
    } catch (e: any) {
        console.error("emitNfseFocus error:", e);
        return { success: false, error: e.message };
    }
}

export async function consultarNfseFocus(referencia: string, environment: 'production' | 'homologation') {
    try {
        const token = environment === 'production'
            ? process.env.FOCUSNFE_PROD_TOKEN
            : process.env.FOCUSNFE_HOM_TOKEN;

        if (!token) throw new Error("Token não configurado");

        const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');
        const baseConsultaUrl = environment === 'production'
            ? `https://api.focusnfe.com.br/v2/nfse/${referencia}`
            : `https://homologacao.focusnfe.com.br/v2/nfse/${referencia}`;

        // Some refs return 404 on `completa=1` while still available in base endpoint.
        let res = await fetch(`${baseConsultaUrl}?completa=1`, {
            method: "GET",
            headers: { "Authorization": authHeader }
        });
        if (res.status === 404) {
            res = await fetch(baseConsultaUrl, {
                method: "GET",
                headers: { "Authorization": authHeader }
            });
        }

        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const rawText = await res.text();
            throw new Error(`API retornou HTML ou texto puro na consulta (${res.status}): ${rawText.substring(0, 100)}...`);
        }

        if (!res.ok) return { success: false, error: JSON.stringify(data) };

        const baseUrl = environment === 'production'
            ? 'https://api.focusnfe.com.br'
            : 'https://homologacao.focusnfe.com.br';

        const caminhoXml = data?.caminho_xml_nota_fiscal;
        if (typeof caminhoXml === "string" && caminhoXml.trim() !== "") {
            const xmlUrl = caminhoXml.startsWith("http") ? caminhoXml : `${baseUrl}${caminhoXml}`;
            data.xml_nota_fiscal_url = xmlUrl;

            // Fetch XML on server side so the UI can present/download it right away.
            try {
                const xmlRes = await fetch(xmlUrl, {
                    method: "GET",
                    headers: { "Authorization": authHeader }
                });
                const xmlText = await xmlRes.text();
                if (xmlRes.ok && xmlText.trim().startsWith("<")) {
                    data.xml_nota_fiscal = xmlText;
                } else {
                    data.xml_nota_fiscal_fetch_error = `Falha ao baixar XML (${xmlRes.status}).`;
                }
            } catch (xmlErr: any) {
                data.xml_nota_fiscal_fetch_error = xmlErr?.message || "Erro ao baixar XML.";
            }
        }

        return { success: true, data: data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

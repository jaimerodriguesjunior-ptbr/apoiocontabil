"use server";

import { createClient } from "@/utils/supabase/server";
import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";

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
    csc_token_production?: string;
    csc_id_production?: string;
    csc_token_homologation?: string;
    csc_id_homologation?: string;
    nfse_login?: string;
    nfse_password?: string;
};

export async function registerCompanyInNuvemFiscal(data: CompanyData) {
    const supabase = createClient();

    try {
        if (!data.cpf_cnpj || !data.razao_social || !data.logradouro || !data.codigo_municipio_ibge) {
            throw new Error("Dados obrigatórios faltando (CNPJ, Razão Social, Endereço, IBGE).");
        }

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
            csc_id_production: data.csc_id_production,
            csc_id_homologation: data.csc_id_homologation,
            csc_token_production: data.csc_token_production,
            csc_token_homologation: data.csc_token_homologation,
            nfse_login: data.nfse_login,
            nfse_password: data.nfse_password
        };

        const { error: dbError } = await supabase
            .from("company_settings")
            .upsert(upsertData, { onConflict: 'cnpj' });

        if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

        // 2. Configure in Nuvem Fiscal Environments
        const configureEnvironment = async (env: 'production' | 'homologation') => {
            try {
                const token = await getNuvemFiscalToken(env);
                const baseUrl = env === 'production'
                    ? (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br")
                    : (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br");

                console.log(`[NuvemFiscal] Configurando ambiente: ${env.toUpperCase()} em ${baseUrl}`);

                // A. Register Company
                const nfPayload = {
                    cpf_cnpj: data.cpf_cnpj.replace(/\D/g, ""),
                    nome_razao_social: data.razao_social,
                    nome_fantasia: data.nome_fantasia,
                    email: data.email_contato,
                    inscricao_estadual: data.inscricao_estadual,
                    inscricao_municipal: data.inscricao_municipal,
                    endereco: {
                        logradouro: data.logradouro,
                        numero: data.numero,
                        complemento: data.complemento,
                        bairro: data.bairro,
                        codigo_municipio: data.codigo_municipio_ibge,
                        cidade: data.cidade,
                        uf: data.uf,
                        cep: data.cep.replace(/\D/g, ""),
                        pais: "BRASIL"
                    },
                    regime_tributario: Number(data.regime_tributario) || 1
                };

                const resEmpresa = await fetch(`${baseUrl}/empresas`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(nfPayload)
                });

                if (!resEmpresa.ok) {
                    if (resEmpresa.status === 409 || resEmpresa.status === 400) {
                        console.log(`[NuvemFiscal] Empresa já existe em ${env}, atualizando...`);
                        await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}`, {
                            method: "PUT",
                            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                            body: JSON.stringify(nfPayload)
                        });
                    } else {
                        console.error(`[NuvemFiscal] Erro ao criar empresa em ${env}:`, await resEmpresa.text());
                    }
                }

                // B. Configure NFC-e (Optional for this test, but good to have)
                const cscId = env === 'production' ? data.csc_id_production : data.csc_id_homologation;
                const cscToken = env === 'production' ? data.csc_token_production : data.csc_token_homologation;

                if (cscId && cscToken) {
                    console.log(`[NuvemFiscal] Configurando NFC-e em ${env}...`);
                    const nfcePayload = {
                        ambiente: env === 'production' ? "producao" : "homologacao",
                        sefaz: { id_csc: Number(cscId), csc: cscToken }
                    };

                    await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfce`, {
                        method: "PUT",
                        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify(nfcePayload)
                    });
                }

                // C. Configure NFS-e
                if (data.nfse_login && data.nfse_password) {
                    console.log(`[NuvemFiscal] Configurando NFS-e em ${env}...`);
                    const nfsePayload = {
                        ambiente: env === 'production' ? "producao" : "homologacao",
                        prefeitura: {
                            login: data.nfse_login,
                            senha: data.nfse_password
                        },
                        // Toledo default configuration might require more details, but starting with login/pass
                    };

                    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

                    let resNfse = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfse`, {
                        method: "PUT",
                        headers,
                        body: JSON.stringify(nfsePayload)
                    });

                    if (!resNfse.ok && resNfse.status === 404) {
                        resNfse = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfse`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify(nfsePayload)
                        });
                    }

                    if (!resNfse.ok) {
                        console.error(`[NuvemFiscal] Erro NFS-e ${env}:`, await resNfse.text());
                    }
                }

            } catch (e: any) {
                console.error(`[NuvemFiscal] Erro fatal no ambiente ${env}:`, e.message);
            }
        };

        await Promise.all([
            configureEnvironment('production'),
            configureEnvironment('homologation')
        ]);

        return { success: true, message: "Empresa registrada e configurada!" };

    } catch (error: any) {
        console.error("Erro em registerCompanyInNuvemFiscal:", error);
        return { success: false, error: error.message };
    }
}

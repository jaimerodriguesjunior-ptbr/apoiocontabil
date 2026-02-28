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
    aliquota_iss?: string;
    codigo_servico?: string;
};

export async function registerCompanyInNuvemFiscal(data: CompanyData) {
    const supabase = await createClient();

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
            nfse_password: data.nfse_password,
            aliquota_iss: data.aliquota_iss ? Number(data.aliquota_iss) : 0,
            codigo_servico: data.codigo_servico || '2.01'
        };

        const { error: dbError } = await supabase
            .from("company_settings")
            .upsert(upsertData, { onConflict: 'cnpj' });

        if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

        const results: any = {};

        // 2. Configure in Nuvem Fiscal Environments
        const configureEnvironment = async (env: 'production' | 'homologation') => {
            try {
                const token = await getNuvemFiscalToken(env);
                const rawUrl = env === 'production'
                    ? (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br")
                    : (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br");
                const baseUrl = rawUrl.replace(/\/+$/, ''); // Remove trailing slash

                console.log(`[NuvemFiscal] Configurando ambiente: ${env.toUpperCase()} em ${baseUrl}`);

                // A. Register Company
                const nfPayload = {
                    cpf_cnpj: data.cpf_cnpj.replace(/\D/g, ""),
                    nome_razao_social: data.razao_social,
                    nome_fantasia: data.nome_fantasia,
                    email: data.email_contato,
                    fone: data.telefone,
                    inscricao_estadual: data.inscricao_estadual,
                    inscricao_municipal: data.inscricao_municipal,
                    endereco: {
                        logradouro: data.logradouro,
                        numero: data.numero,
                        complemento: data.complemento,
                        bairro: data.bairro,
                        codigo_municipio: data.codigo_municipio_ibge.replace(/\D/g, ""),
                        cidade: data.cidade,
                        uf: data.uf,
                        cep: data.cep.replace(/\D/g, ""),
                        pais: "BRASIL"
                    }
                };

                const resEmpresa = await fetch(`${baseUrl}/empresas`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(nfPayload)
                });

                if (!resEmpresa.ok) {
                    console.log(`[NuvemFiscal] POST falhou (${resEmpresa.status}) em ${env}, tentando PUT...`);
                    const resPut = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}`, {
                        method: "PUT",
                        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                        body: JSON.stringify(nfPayload)
                    });
                    if (!resPut.ok) {
                        const errorText = await resPut.text();
                        console.error(`[NuvemFiscal] PUT também falhou em ${env}:`, errorText);
                        results[env] = { success: false, step: 'register', error: errorText };
                        return;
                    }
                }

                // C. Configure NFS-e (always configure, credentials optional)
                console.log(`[NuvemFiscal] Configurando NFS-e em ${env}...`);

                // GET current config to preserve RPS numero (avoid resetting counter)
                let currentRpsNumero = 1; // Default only for first-time setup
                let currentRpsSerie = "1";
                try {
                    const resCurrentConfig = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfse`, {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (resCurrentConfig.ok) {
                        const currentConfig = await resCurrentConfig.json();
                        if (currentConfig?.rps?.numero) {
                            currentRpsNumero = currentConfig.rps.numero;
                            console.log(`[NuvemFiscal] RPS atual na Nuvem Fiscal (${env}): Serie=${currentConfig.rps.serie}, Numero=${currentRpsNumero}, Lote=${currentConfig.rps.lote}`);
                        }
                        if (currentConfig?.rps?.serie) {
                            currentRpsSerie = currentConfig.rps.serie;
                        }
                    } else {
                        console.log(`[NuvemFiscal] Nenhuma config NFS-e existente em ${env} (${resCurrentConfig.status}). Usando defaults.`);
                    }
                } catch (e) {
                    console.log(`[NuvemFiscal] Erro ao buscar config atual em ${env}, usando defaults:`, e);
                }

                const nfsePayload: any = {
                    ambiente: env === 'production' ? "producao" : "homologacao",
                    regTrib: {
                        opSimpNac: 1, // 1 = Simples Nacional
                        regApTribSN: 1, // 1 = Microempresa Municipal (Sem Dedução) / Padrão
                        regEspTrib: 0
                    },
                    rps: {
                        lote: Math.floor(Date.now() / 1000), // Lote novo a cada save (instrução Equiplano)
                        serie: currentRpsSerie,
                        numero: currentRpsNumero
                    },
                    incentivo_fiscal: false
                };
                if (data.nfse_login && data.nfse_password) {
                    nfsePayload.prefeitura = {
                        login: data.nfse_login,
                        senha: data.nfse_password
                    };
                }

                const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

                // Try updating first (PUT)
                let resNfse = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfse`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(nfsePayload)
                });

                // If not found (404), try creating (POST)
                if (!resNfse.ok && resNfse.status === 404) {
                    resNfse = await fetch(`${baseUrl}/empresas/${nfPayload.cpf_cnpj}/nfse`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(nfsePayload)
                    });
                }

                if (!resNfse.ok) {
                    const errorText = await resNfse.text();
                    console.error(`[NuvemFiscal] Erro NFS-e ${env}:`, errorText);
                    results[env] = { success: false, step: 'nfse_config', error: errorText };
                    return;
                }

                results[env] = { success: true };

            } catch (e: any) {
                console.error(`[NuvemFiscal] Erro fatal no ambiente ${env}:`, e.message);
                results[env] = { success: false, error: e.message };
            }
        };

        await Promise.all([
            configureEnvironment('production'),
            configureEnvironment('homologation')
        ]);

        return { success: true, message: "Processo concluído.", results };

    } catch (error: any) {
        console.error("Erro em registerCompanyInNuvemFiscal:", error);
        return { success: false, error: error.message };
    }
}

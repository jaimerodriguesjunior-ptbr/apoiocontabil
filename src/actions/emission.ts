"use server";

import { createClient } from "@/utils/supabase/server";
import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";

type EmissionData = {
    cnpj: string;
    tomador: {
        cpf_cnpj: string;
        razao_social: string;
        email: string;
        telefone?: string;
        endereco: {
            logradouro: string;
            numero: string;
            bairro: string;
            codigo_municipio: string;
            cidade: string;
            uf: string;
            cep: string;
        };
    };
    servico: {
        codigo_servico: string;
        discriminacao: string;
        valor_servicos: number;
    };
    rps_serie?: string;
    rps_numero?: string;
};

export async function emitirNFSe(data: EmissionData, environment: 'production' | 'homologation' = 'production') {
    const supabase = await createClient();

    try {
        // 1. Get Company Settings from Supabase
        const { data: company, error: compError } = await supabase
            .from("company_settings")
            .select("*")
            .eq("cnpj", data.cnpj)
            .single();

        if (compError || !company) throw new Error("Configurações da empresa não encontradas.");

        // 2. Get Nuvem Fiscal Token
        const token = await getNuvemFiscalToken(environment);
        const rawUrl = environment === 'production'
            ? (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br")
            : (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br");
        const baseUrl = rawUrl.replace(/\/+$/, '');

        // 3. Build Payload
        // Specific for Toledo (Equiplano via Nuvem Fiscal)
        const payload = {
            referencia: `teste-amplotec-${Date.now()}`, // Bypasses Nuvem Fiscal idempotency cache
            ambiente: environment === 'production' ? 'producao' : 'homologacao',
            infDPS: {
                tpAmb: environment === 'production' ? 1 : 2,
                dhEmi: new Date().toISOString(),
                dCompet: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                verAplic: "1.0",
                prest: {
                    CNPJ: company.cnpj.replace(/\D/g, ""),
                },
                toma: {
                    CNPJ: data.tomador.cpf_cnpj.length > 11 ? data.tomador.cpf_cnpj.replace(/\D/g, "") : undefined,
                    CPF: data.tomador.cpf_cnpj.length <= 11 ? data.tomador.cpf_cnpj.replace(/\D/g, "") : undefined,
                    xNome: data.tomador.razao_social,
                    fone: data.tomador.telefone ? data.tomador.telefone.replace(/\D/g, "") : undefined,
                    end: {
                        xLgr: data.tomador.endereco.logradouro,
                        nro: data.tomador.endereco.numero,
                        xBairro: data.tomador.endereco.bairro,
                        endNac: {
                            cMun: data.tomador.endereco.codigo_municipio.replace(/\D/g, ""),
                            CEP: data.tomador.endereco.cep.replace(/\D/g, "")
                        }
                    }
                },
                serv: {
                    cServ: {
                        cTribNac: data.servico.codigo_servico || company.codigo_servico,
                        cTribMun: data.servico.codigo_servico || company.codigo_servico,
                        xDescServ: data.servico.discriminacao,
                        cSitTrib: "0", // 0 = Tributado no município
                    },
                },
                valores: {
                    vServPrest: {
                        vServ: data.servico.valor_servicos
                    },
                    trib: {
                        tribMun: {
                            tribISSQN: 1, // 1 - Tributação Normal (variável conforme regime, mas 1 costuma passar para Simples)
                            tpRetISSQN: 2, // 2 - Sem Retenção
                            pAliq: company.aliquota_iss ? Number(company.aliquota_iss) : 2.01,
                            vISSQN: Number((data.servico.valor_servicos * (Number(company.aliquota_iss || 2.01) / 100)).toFixed(2)),
                            cLocIncid: company.codigo_municipio_ibge || "4127700" // Toledo
                        }
                    }
                }
            },
            ...(data.rps_serie ? { serie: data.rps_serie } : {}),
            ...(data.rps_numero ? { numero: data.rps_numero } : {})
        };

        console.log("\n\n=== PAYLOAD ENVIADO PARA NUVEM FISCAL ===");
        console.log(JSON.stringify(payload, null, 2));
        console.log("=========================================\n\n");
        console.log(`[API] Emitindo NFS-e (${environment}) para ${company.cnpj}...`);

        const response = await fetch(`${baseUrl}/nfse/dps`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("[API] Erro ao emitir NFS-e:", result);
            return { success: false, error: result.error || result };
        }

        return { success: true, data: result };

    } catch (error: any) {
        console.error("Erro na emissão:", error);
        return { success: false, error: error.message };
    }
}

export async function consultarNFSe(id: string, environment: 'production' | 'homologation' = 'production') {
    try {
        const token = await getNuvemFiscalToken(environment);
        const rawUrl = environment === 'production'
            ? (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br")
            : (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br");
        const baseUrl = rawUrl.replace(/\/+$/, '');

        const response = await fetch(`${baseUrl}/nfse/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("[API] Erro ao consultar NFS-e:", result);
            return { success: false, error: result.error || result };
        }

        return { success: true, data: result };

    } catch (error: any) {
        console.error("Erro na consulta:", error);
        return { success: false, error: error.message };
    }
}

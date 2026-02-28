import { NextRequest, NextResponse } from "next/server";
import { getNuvemFiscalToken } from "@/lib/nuvemfiscal";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const cnpj = formData.get("cnpj") as string;
        const password = formData.get("password") as string;

        if (!file || !cnpj || !password) {
            return NextResponse.json({ error: "Arquivo, CNPJ ou Senha faltando." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Cert = buffer.toString("base64");
        const cleanCnpj = cnpj.replace(/\D/g, "");

        const environments = ['production', 'homologation'] as const;
        const results = [];

        for (const env of environments) {
            try {
                // 1. Get Token for specific env
                const token = await getNuvemFiscalToken(env);

                // 2. Determine URL
                const rawUrl = env === 'production'
                    ? (process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br")
                    : (process.env.NUVEMFISCAL_HOM_URL || "https://api.sandbox.nuvemfiscal.com.br");
                const baseUrl = rawUrl.replace(/\/+$/, ''); // Remove trailing slash

                console.log(`[API] Uploading cert for ${cleanCnpj} to ${env.toUpperCase()} (${baseUrl})`);

                const response = await fetch(`${baseUrl}/empresas/${cleanCnpj}/certificado`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        certificado: base64Cert,
                        password: password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error(`[API] Error uploading to ${env}:`, errorData);
                    results.push({ env, success: false, error: errorData });
                } else {
                    results.push({ env, success: true });
                }

            } catch (e: any) {
                console.error(`[API] Fatal error for ${env}:`, e);
                results.push({ env, success: false, error: e.message });
            }
        }

        // Check if at least one succeeded
        const anySuccess = results.some(r => r.success);
        if (anySuccess) {
            return NextResponse.json({ success: true, results });
        } else {
            return NextResponse.json({ error: { message: "Falha no upload para ambos os ambientes.", details: results } }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Erro no upload do certificado:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

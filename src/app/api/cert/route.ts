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

        // 1. Get Token (Platform Credentials)
        const token = await getNuvemFiscalToken();

        // 2. Prepare Base64 Certificate
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Cert = buffer.toString("base64");

        // 3. Send to Nuvem Fiscal (Environment = Production by default for certs, usually)
        // Note: Nuvem Fiscal uses the same endpoint for certs regardless of environment, 
        // but we should respect the environment variable if we want to test in sandbox.
        // However, certs are usually unique per company. 
        // We will default to PROD URL from env or fallback to standard API.

        const baseUrl = process.env.NUVEMFISCAL_PROD_URL || "https://api.nuvemfiscal.com.br";

        // Clean CNPJ
        const cleanCnpj = cnpj.replace(/\D/g, "");

        console.log(`[API] Uploading cert for ${cleanCnpj} to ${baseUrl}`);

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
            console.error("[API] Error uploading cert:", errorData);
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erro no upload do certificado:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

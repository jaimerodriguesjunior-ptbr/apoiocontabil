import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAccountantContext } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildCompanyReport, type ReportDocument } from "@/lib/accountant-report";
import { getPortfolioOwnerId } from "@/lib/accountant-team";

function csvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[;\n\"]/.test(text) ? `"${text.replace(/\"/g, '""')}"` : text;
}

function filePart(value: string | null | undefined) {
  return String(value || "sem-numero").replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function getXml(document: ReportDocument) {
  if (document.xml_content) return document.xml_content;
  if (!document.xml_url) return null;
  try {
    const response = await fetch(document.xml_url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAccountantContext();
    const { id } = await params;
    const period = new URL(request.url).searchParams.get("period") || "";
    const admin = createAdminClient();
    const ownerId = await getPortfolioOwnerId(admin, context.userId);
    const { data: company } = await admin
      .from("organizations")
      .select("id")
      .eq("id", id)
      .eq("owner_accountant_id", ownerId)
      .maybeSingle();
    if (!company) return NextResponse.json({ error: "Empresa não encontrada na sua carteira." }, { status: 404 });

    const report = await buildCompanyReport({ organizationId: id, period, includeXml: true });
    const zip = new JSZip();
    const folder = `Fechamento_${period}`;
    const root = zip.folder(folder)!;
    const rows = [
      ["RELATORIO DE FECHAMENTO"],
      ["Empresa", report.companyName],
      ["Período", report.period],
      ["Módulo", report.module || "não configurado"],
      [],
      ["NFS-e autorizadas", report.nfse.authorized.count, report.nfse.authorized.total.toFixed(2)],
      ["NFS-e canceladas", report.nfse.cancelled.count, report.nfse.cancelled.total.toFixed(2)],
      ["NFS-e pendentes/erros", report.nfse.pending],
      ["NF-e entradas", report.nfe.entries.count, report.nfe.entries.total.toFixed(2)],
      ["NF-e vendas", report.nfe.sales.count, report.nfe.sales.total.toFixed(2)],
      ["NF-e devoluções", report.nfe.returns.count, report.nfe.returns.total.toFixed(2)],
      ["NF-e pendentes/erros", report.nfe.pending],
      ["Despesas", report.expenses.count, report.expenses.total.toFixed(2)],
      [],
      ["TIPO", "NÚMERO", "SÉRIE", "STATUS", "DIREÇÃO", "DATA", "VALOR", "CHAVE"],
      ...report.documents.map((item) => [item.tipo_documento, item.numero, item.serie, item.status, item.direction, item.data_emissao || item.created_at, item.valor_total, item.chave_acesso]),
    ];
    root.file("Resumo_Fechamento.csv", "\ufeff" + rows.map((row) => row.map(csvValue).join(";")).join("\n"));

    const missingXml: string[][] = [["TIPO", "NÚMERO", "STATUS", "MOTIVO"]];
    for (const document of report.documents) {
      const xml = await getXml(document);
      if (!xml) {
        missingXml.push([document.tipo_documento || "", document.numero || "", document.status || "", "XML não disponível"]);
        continue;
      }
      const direction = ["entry", "input"].includes(String(document.direction || "").toLowerCase()) ? "Entradas" : "Saidas";
      root.folder(`XMLs_${direction}`)?.file(`${filePart(document.tipo_documento)}_${filePart(document.numero)}_${filePart(document.serie)}_${filePart(document.id)}.xml`, xml);
    }
    root.file("XMLs_nao_disponiveis.csv", "\ufeff" + missingXml.map((row) => row.map(csvValue).join(";")).join("\n"));

    const file = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const body = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folder}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar o fechamento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

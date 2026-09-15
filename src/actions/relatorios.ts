"use server";

import { requireAccountantContext } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildCompanyReport } from "@/lib/accountant-report";
import { getPortfolioOwnerId } from "@/lib/accountant-team";

export async function getAccountantCompanyReport(organizationId: string, period: string) {
  const context = await requireAccountantContext();
  const admin = createAdminClient();
  const ownerId = await getPortfolioOwnerId(admin, context.userId);
  const { data: company } = await admin
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("owner_accountant_id", ownerId)
    .maybeSingle();

  if (!company) throw new Error("Empresa não encontrada na sua carteira.");
  return buildCompanyReport({ organizationId, period });
}

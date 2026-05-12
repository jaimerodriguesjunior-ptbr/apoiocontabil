"use server";

import { revalidatePath } from "next/cache";
import { requireAccountantContext, requireCompanyOperatorContext } from "@/lib/auth-context";

async function getOrgId() {
  const context = await requireAccountantContext();
  return { supabase: context.supabase, orgId: context.orgId as string };
}

export async function getCompany() {
  const context = await requireCompanyOperatorContext();
  const { supabase, orgId } = { supabase: context.supabase, orgId: context.orgId as string };
  if (!orgId) return null;

  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  return data;
}

export async function getAccountantOwnCompany() {
  const { supabase, orgId } = await getOrgId();
  if (!orgId) return null;

  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  return data;
}

export async function saveCompany(data: Record<string, unknown>) {
  const { supabase, orgId } = await getOrgId();
  if (!orgId) return { error: "Organização não encontrada" };

  const { error } = await supabase.from("company_settings").upsert(
    {
      organization_id: orgId,
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/empresa");
  return { success: true };
}

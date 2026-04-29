"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function getOrgId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, orgId: profile?.organization_id as string };
}

export async function getCompany() {
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

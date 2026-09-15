import { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getPortfolioOwnerId(admin: AdminClient, accountantId: string) {
  const { data, error } = await admin
    .from("accountant_team_members")
    .select("owner_accountant_id")
    .eq("accountant_id", accountantId)
    .maybeSingle();
  // Mantém o contador titular funcionando enquanto a migração ainda não foi aplicada
  // no projeto Supabase. O PostgREST reporta a tabela ausente como PGRST205.
  if (error && error.code !== "42P01" && error.code !== "PGRST205") throw error;
  return data?.owner_accountant_id || accountantId;
}

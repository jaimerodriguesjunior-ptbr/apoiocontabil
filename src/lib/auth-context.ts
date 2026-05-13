import { createClient } from "@/utils/supabase/server";

export type UserRole = "contador" | "cliente_admin" | "cliente_usuario";
export type ModuleAccess = string;

type ProfileContext = {
  organization_id: string | null;
  role?: UserRole | null;
  is_active?: boolean | null;
  full_name?: string | null;
};

type OrganizationContext = {
  id: string;
  name?: string | null;
  module_access?: ModuleAccess | null;
  is_blocked?: boolean | null;
  blocked_reason?: string | null;
};

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  orgId: string | null;
  role: UserRole;
  isActive: boolean;
  organization: OrganizationContext | null;
};

export type AppArea = "accountant" | "company";

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role, is_active, full_name")
    .eq("id", user.id)
    .maybeSingle<ProfileContext>();

  let safeProfile = profile;

  if (profileError) {
    const { data: legacyProfile } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .maybeSingle<ProfileContext>();

    safeProfile = legacyProfile;
  }

  const orgId = safeProfile?.organization_id ?? null;
  let organization: OrganizationContext | null = null;

  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, module_access, is_blocked, blocked_reason")
      .eq("id", orgId)
      .maybeSingle<OrganizationContext>();

    organization = org ?? null;
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    orgId,
    role: safeProfile?.role ?? "cliente_admin",
    isActive: safeProfile?.is_active ?? true,
    organization,
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) throw new Error("Nao autenticado");
  return context;
}

export function canManageCompanySettings(role: UserRole) {
  return role === "contador";
}

export function canManageFixedExpenses(role: UserRole) {
  return role === "cliente_admin";
}

export function canOperateCompany(role: UserRole) {
  return role === "cliente_admin" || role === "cliente_usuario";
}

export function getDefaultPathForRole(role: UserRole) {
  return role === "contador" ? "/empresas" : "/dashboard";
}

export function getAreaForPath(pathname: string): AppArea {
  if (pathname.startsWith("/empresas")) return "accountant";
  return "company";
}

export function canAccessArea(role: UserRole, area: AppArea) {
  if (area === "accountant") return role === "contador";
  return role === "cliente_admin" || role === "cliente_usuario";
}

export async function requireCompanyOperatorContext() {
  const context = await requireAuthContext();

  if (!canOperateCompany(context.role)) {
    throw new Error("Apenas usuarios da empresa podem executar esta acao.");
  }

  if (!context.isActive) {
    throw new Error("Usuario desativado.");
  }

  if (context.organization?.is_blocked) {
    throw new Error(context.organization.blocked_reason || "Empresa bloqueada pelo escritorio contabil.");
  }

  if (!context.orgId) {
    throw new Error("Empresa nao encontrada para o usuario.");
  }

  return context;
}

export async function requireAccountantContext() {
  const context = await requireAuthContext();

  if (context.role !== "contador") {
    throw new Error("Apenas o contador pode executar esta acao.");
  }

  if (!context.isActive) {
    throw new Error("Usuario desativado.");
  }

  return context;
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuthContext } from "@/lib/auth-context";

type CompanyInput = {
  id?: string;
  name: string;
  document?: string;
  moduleAccess?: "nfse" | "nfce" | "nfse_nfce";
  isBlocked?: boolean;
  blockedReason?: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  inscricao_municipal?: string;
  inscricao_estadual?: string;
  regime_tributario?: string;
  codigo_municipio_ibge?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  email_contato?: string;
  telefone?: string;
  nfse_login?: string;
  nfse_password?: string;
  cnae_padrao?: string;
  codigo_servico_padrao?: string;
  aliquota_iss_padrao?: number | null;
  environment?: string;
};

type CompanyUserInput = {
  organizationId: string;
  fullName: string;
  email: string;
  password: string;
  role: "cliente_admin" | "cliente_usuario";
};

type ResetPasswordInput = {
  organizationId: string;
  userId: string;
  password: string;
};

async function requireAccountant() {
  const context = await requireAuthContext();

  if (context.role !== "contador") {
    throw new Error("Apenas o contador pode acessar esta area.");
  }

  return context;
}

function cleanText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function getAccountantCompanies() {
  const context = await requireAccountant();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("organizations")
    .select("id, name, document, module_access, is_blocked, blocked_reason, created_at")
    .eq("owner_accountant_id", context.userId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getAccountantCompany(id: string) {
  const context = await requireAccountant();
  const admin = createAdminClient();

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, name, document, module_access, is_blocked, blocked_reason, blocked_at")
    .eq("id", id)
    .eq("owner_accountant_id", context.userId)
    .single();

  if (orgError) throw orgError;

  const [{ data: companySettings }, { data: users }] = await Promise.all([
    admin.from("company_settings").select("*").eq("organization_id", id).maybeSingle(),
    admin
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .eq("organization_id", id)
      .in("role", ["cliente_admin", "cliente_usuario"])
      .order("created_at"),
  ]);

  return {
    organization,
    companySettings,
    users: users || [],
  };
}

export async function saveAccountantCompany(data: CompanyInput) {
  const context = await requireAccountant();
  const admin = createAdminClient();

  if (!data.name.trim()) return { error: "Informe o nome da empresa." };

  const organizationPayload = {
    name: data.name.trim(),
    document: cleanText(data.document || data.cnpj),
    module_access: data.moduleAccess || "nfse",
    is_blocked: Boolean(data.isBlocked),
    blocked_reason: data.isBlocked ? cleanText(data.blockedReason) : null,
    blocked_at: data.isBlocked ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  let organizationId = data.id;

  if (organizationId) {
    const { error } = await admin
      .from("organizations")
      .update(organizationPayload)
      .eq("id", organizationId)
      .eq("owner_accountant_id", context.userId);

    if (error) return { error: error.message };
  } else {
    const { data: created, error } = await admin
      .from("organizations")
      .insert({
        ...organizationPayload,
        owner_accountant_id: context.userId,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    organizationId = created.id;
  }

  const settingsPayload = {
    organization_id: organizationId,
    cnpj: cleanText(data.cnpj || data.document),
    razao_social: cleanText(data.razao_social || data.name),
    nome_fantasia: cleanText(data.nome_fantasia),
    inscricao_municipal: cleanText(data.inscricao_municipal),
    inscricao_estadual: cleanText(data.inscricao_estadual),
    regime_tributario: data.regime_tributario || "1",
    codigo_municipio_ibge: cleanText(data.codigo_municipio_ibge),
    cidade: cleanText(data.cidade),
    uf: cleanText(data.uf),
    cep: cleanText(data.cep),
    logradouro: cleanText(data.logradouro),
    numero: cleanText(data.numero),
    complemento: cleanText(data.complemento),
    bairro: cleanText(data.bairro),
    email_contato: cleanText(data.email_contato),
    telefone: cleanText(data.telefone),
    nfse_login: cleanText(data.nfse_login),
    nfse_password: cleanText(data.nfse_password),
    cnae_padrao: cleanText(data.cnae_padrao),
    codigo_servico_padrao: cleanText(data.codigo_servico_padrao),
    aliquota_iss_padrao: data.aliquota_iss_padrao ?? 3,
    environment: data.environment || "production",
    updated_at: new Date().toISOString(),
  };

  const { error: settingsError } = await admin
    .from("company_settings")
    .upsert(settingsPayload, { onConflict: "organization_id" });

  if (settingsError) return { error: settingsError.message };

  revalidatePath("/empresas");
  if (organizationId) revalidatePath(`/empresas/${organizationId}`);

  return { success: true, id: organizationId };
}

export async function createCompanyUser(data: CompanyUserInput) {
  const context = await requireAccountant();
  const admin = createAdminClient();

  if (!data.fullName.trim()) return { error: "Informe o nome do usuario." };
  if (!data.email.trim()) return { error: "Informe o email do usuario." };
  if (data.password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  const { data: organization } = await admin
    .from("organizations")
    .select("id")
    .eq("id", data.organizationId)
    .eq("owner_accountant_id", context.userId)
    .single();

  if (!organization) return { error: "Empresa nao encontrada para este contador." };

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: data.email.trim(),
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName.trim(),
    },
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: authUser.user.id,
      organization_id: data.organizationId,
      full_name: data.fullName.trim(),
      email: data.email.trim(),
      role: data.role,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) return { error: profileError.message };

  revalidatePath(`/empresas/${data.organizationId}`);
  return { success: true };
}

export async function resetCompanyUserPassword(data: ResetPasswordInput) {
  const context = await requireAccountant();
  const admin = createAdminClient();

  if (data.password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  const { data: profile } = await admin
    .from("profiles")
    .select("id, organization_id, role")
    .eq("id", data.userId)
    .eq("organization_id", data.organizationId)
    .in("role", ["cliente_admin", "cliente_usuario"])
    .single();

  if (!profile) return { error: "Usuario nao encontrado nesta empresa." };

  const { data: organization } = await admin
    .from("organizations")
    .select("id")
    .eq("id", data.organizationId)
    .eq("owner_accountant_id", context.userId)
    .single();

  if (!organization) return { error: "Empresa nao encontrada para este contador." };

  const { error } = await admin.auth.admin.updateUserById(data.userId, {
    password: data.password,
  });

  if (error) return { error: error.message };

  revalidatePath(`/empresas/${data.organizationId}`);
  return { success: true };
}

export async function getDisabledFixedExpenses(organizationId: string) {
  await requireAccountant();
  const admin = createAdminClient();

  const { data } = await admin
    .from("company_settings")
    .select("disabled_fixed_expenses")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const raw = data?.disabled_fixed_expenses;
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

export async function toggleFixedExpenseForCompany(input: {
  organizationId: string;
  expenseName: string;
  enabled: boolean;
}) {
  await requireAccountant();
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("company_settings")
    .select("disabled_fixed_expenses")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  const current: string[] = Array.isArray(settings?.disabled_fixed_expenses)
    ? settings.disabled_fixed_expenses
    : [];

  let updated: string[];
  if (input.enabled) {
    updated = current.filter((name: string) => name !== input.expenseName);
  } else {
    updated = current.includes(input.expenseName)
      ? current
      : [...current, input.expenseName];
  }

  const { error } = await admin
    .from("company_settings")
    .update({
      disabled_fixed_expenses: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId);

  if (error) return { error: error.message };

  revalidatePath(`/empresas/${input.organizationId}`);
  return { success: true };
}

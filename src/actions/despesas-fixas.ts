"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyOperatorContext } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase-admin";

const DEFAULT_FIXED_EXPENSES = [
  "FGTS",
  "INSS",
  "Folha de Pgto",
  "Aluguel",
  "Contador",
  "Socios",
  "Compras",
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function getCompanyContext() {
  const context = await requireCompanyOperatorContext();
  return {
    supabase: context.supabase,
    orgId: context.orgId as string,
    userId: context.userId,
    role: context.role,
  };
}

async function ensureDefaultFixedExpenseTemplates(orgId: string, userId: string) {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("fixed_expense_templates")
    .select("id, name, active")
    .eq("organization_id", orgId)
    .in("name", DEFAULT_FIXED_EXPENSES);

  if (existingError) throw existingError;

  const activeByName = new Map(
    (existing || [])
      .filter((template) => template.active)
      .map((template) => [template.name, template.id])
  );
  const inactive = (existing || []).filter((template) => !template.active);
  const missing = DEFAULT_FIXED_EXPENSES.filter((name) => !activeByName.has(name));

  for (const name of missing) {
    const inactiveTemplate = inactive.find((template) => template.name === name);

    if (inactiveTemplate) {
      const { error } = await admin
        .from("fixed_expense_templates")
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq("id", inactiveTemplate.id);

      if (error) throw error;
      activeByName.set(name, inactiveTemplate.id);
      continue;
    }

    const { data: created, error } = await admin
      .from("fixed_expense_templates")
      .insert({
        organization_id: orgId,
        name,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    activeByName.set(name, created.id);
  }
}

export async function getFixedExpenseTemplates() {
  const { supabase, orgId } = await getCompanyContext();

  const { data, error } = await supabase
    .from("fixed_expense_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getPendingFixedExpenses(referenceMonth = getCurrentMonth()) {
  const { supabase, orgId, userId } = await getCompanyContext();
  await ensureDefaultFixedExpenseTemplates(orgId, userId);

  const currentYear = referenceMonth.split("-")[0];
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const [
    { data: templates, error: templatesError },
    { data: entries, error: entriesError },
    { data: annualInvoices, error: invoicesError },
    { data: annualExpenses, error: expensesError },
    { data: companyConfig },
  ] = await Promise.all([
    supabase
      .from("fixed_expense_templates")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .in("name", DEFAULT_FIXED_EXPENSES),
    supabase
      .from("fixed_expense_entries")
      .select("id, template_id, amount, expense_id")
      .eq("organization_id", orgId)
      .eq("reference_month", referenceMonth),
    supabase
      .from("fiscal_invoices")
      .select("valor_total")
      .eq("organization_id", orgId)
      .eq("status", "authorized")
      .gte("mes_referencia", `${currentYear}-01`)
      .lte("mes_referencia", `${currentYear}-12`),
    supabase
      .from("expenses")
      .select("amount, source, reference_month")
      .eq("organization_id", orgId)
      .eq("active", true)
      .gte("reference_month", `${currentYear}-01`)
      .lte("reference_month", `${currentYear}-12`),
    supabase
      .from("company_settings")
      .select("disabled_fixed_expenses")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  if (templatesError) throw templatesError;
  if (entriesError) throw entriesError;
  if (invoicesError) throw invoicesError;
  if (expensesError) throw expensesError;

  const entriesByTemplate = new Map((entries || []).map((entry) => [entry.template_id, entry]));
  const templatesByName = new Map((templates || []).map((template) => [template.name, template]));

  const totalInvoicedYear = (annualInvoices || []).reduce((acc, inv) => acc + (inv.valor_total || 0), 0);
  const totalExpensesYear = (annualExpenses || []).reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

  const totalVariableMonth = (annualExpenses || [])
    .filter((exp) => exp.reference_month === referenceMonth && exp.source !== "fixed")
    .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

  const disabledExpenses: string[] = Array.isArray(companyConfig?.disabled_fixed_expenses)
    ? companyConfig.disabled_fixed_expenses
    : [];
  const activeExpenses = DEFAULT_FIXED_EXPENSES.filter((name) => !disabledExpenses.includes(name));

  return {
    referenceMonth,
    totalInvoicedYear,
    totalExpensesYear,
    items: activeExpenses.map((name) => {
      const template = templatesByName.get(name);

      if (name === "Compras") {
        return {
          templateId: template?.id || "compras-id",
          name,
          entryId: "auto",
          expenseId: "auto",
          amount: totalVariableMonth,
        };
      }

      const entry = template ? entriesByTemplate.get(template.id) : null;
      return {
        templateId: template?.id || "",
        name,
        entryId: entry?.id || null,
        expenseId: entry?.expense_id || null,
        amount: entry ? Number(entry.amount || 0) : null,
      };
    }).filter((item) => item.templateId),
  };
}

export async function saveFixedExpenseTemplate(name: string) {
  const { supabase, orgId, userId, role } = await getCompanyContext();

  if (role !== "cliente_admin" && role !== "contador") {
    return { error: "Apenas o admin ou contador podem cadastrar despesas fixas." };
  }

  const cleanName = name.trim();
  if (!cleanName) return { error: "Informe o nome da despesa fixa." };

  // Check for existing template with the same name (case-insensitive)
  const { data: existing } = await supabase
    .from("fixed_expense_templates")
    .select("id, active")
    .ilike("name", cleanName)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (existing) {
    if (existing.active) {
      return { error: "Ja existe uma despesa fixa ativa com esse nome." };
    } else {
      // Reactivate it
      const { error: updateError } = await supabase
        .from("fixed_expense_templates")
        .update({ active: true, name: cleanName, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      
      if (updateError) return { error: updateError.message };
    }
  } else {
    // Insert new
    const { error } = await supabase.from("fixed_expense_templates").insert({
      organization_id: orgId,
      name: cleanName,
      created_by: userId,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteFixedExpenseTemplate(id: string) {
  const { supabase, orgId, role } = await getCompanyContext();

  if (role !== "cliente_admin" && role !== "contador") {
    return { error: "Apenas o admin ou contador podem remover despesas fixas." };
  }

  // Get the template to check its name before deleting
  const { data: template } = await supabase
    .from("fixed_expense_templates")
    .select("name")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (template && DEFAULT_FIXED_EXPENSES.includes(template.name) && role !== "contador") {
    return { error: "Despesas padrao do sistema so podem ser removidas pelo contador." };
  }

  const { error } = await supabase
    .from("fixed_expense_templates")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function fillFixedExpense(input: {
  templateId: string;
  amount: number;
  referenceMonth?: string;
}) {
  const { supabase, orgId, userId } = await getCompanyContext();
  const referenceMonth = input.referenceMonth || getCurrentMonth();

  if (!input.amount || input.amount <= 0) return { error: "Informe um valor maior que zero." };

  const { data: template, error: templateError } = await supabase
    .from("fixed_expense_templates")
    .select("id, name")
    .eq("id", input.templateId)
    .eq("organization_id", orgId)
    .eq("active", true)
    .single();

  if (templateError || !template) return { error: "Despesa fixa nao encontrada." };

  const { data: existing } = await supabase
    .from("fixed_expense_entries")
    .select("id, expense_id")
    .eq("template_id", input.templateId)
    .eq("reference_month", referenceMonth)
    .maybeSingle();

  if (existing) return { error: "Esta despesa fixa ja foi preenchida neste mes." };

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      organization_id: orgId,
      amount: input.amount,
      spent_at: template.name,
      note: "Despesa fixa mensal",
      expense_date: getToday(),
      reference_month: referenceMonth,
      source: "fixed",
      created_by: userId,
    })
    .select("id")
    .single();

  if (expenseError) return { error: expenseError.message };

  const { error: entryError } = await supabase.from("fixed_expense_entries").insert({
    organization_id: orgId,
    template_id: input.templateId,
    reference_month: referenceMonth,
    amount: input.amount,
    expense_id: expense.id,
    created_by: userId,
  });

  if (entryError) return { error: entryError.message };

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateFixedExpense(input: {
  templateId: string;
  referenceMonth?: string;
  amount: number;
}) {
  const { supabase, orgId } = await getCompanyContext();
  const referenceMonth = input.referenceMonth || getCurrentMonth();

  if (!input.amount || input.amount <= 0) return { error: "Informe um valor maior que zero." };

  const { data: template, error: templateError } = await supabase
    .from("fixed_expense_templates")
    .select("id, name")
    .eq("id", input.templateId)
    .eq("organization_id", orgId)
    .eq("active", true)
    .single();

  if (templateError || !template) return { error: "Despesa fixa nao encontrada." };

  const { data: entry, error: entryError } = await supabase
    .from("fixed_expense_entries")
    .select("id, expense_id")
    .eq("template_id", input.templateId)
    .eq("reference_month", referenceMonth)
    .single();

  if (entryError || !entry) return { error: "Despesa fixa ainda nao foi lancada neste mes." };

  const { error: fixedError } = await supabase
    .from("fixed_expense_entries")
    .update({
      amount: input.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id)
    .eq("organization_id", orgId);

  if (fixedError) return { error: fixedError.message };

  if (entry.expense_id) {
    const { error: expenseError } = await supabase
      .from("expenses")
      .update({
        amount: input.amount,
        spent_at: template.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.expense_id)
      .eq("organization_id", orgId);

    if (expenseError) return { error: expenseError.message };
  }

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

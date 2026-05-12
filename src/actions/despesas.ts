"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyOperatorContext } from "@/lib/auth-context";

type ExpenseInput = {
  amount: number;
  spentAt: string;
  note?: string;
  expenseDate?: string;
};

function getReferenceMonth(dateValue?: string) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function getCompanyContext() {
  const context = await requireCompanyOperatorContext();
  return { supabase: context.supabase, orgId: context.orgId as string, userId: context.userId, role: context.role };
}

export async function getExpenses(options?: { limit?: number; referenceMonth?: string }) {
  const { supabase, orgId } = await getCompanyContext();

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.referenceMonth) query = query.eq("reference_month", options.referenceMonth);

  const { data, error } = await query.limit(options?.limit || 100);
  if (error) throw error;
  return data || [];
}

export async function getExpenseStats() {
  const { supabase, orgId } = await getCompanyContext();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const currentMonth = `${year}-${month}`;
  const yearStart = `${year}-01`;
  const yearEnd = `${year}-12`;

  const [{ data: monthExpenses }, { data: yearExpenses }] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("active", true)
      .eq("reference_month", currentMonth),
    supabase
      .from("expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("active", true)
      .gte("reference_month", yearStart)
      .lte("reference_month", yearEnd),
  ]);

  const totalMes = (monthExpenses || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalAno = (yearExpenses || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return { totalMes, totalAno, currentMonth };
}

export async function saveExpense(input: ExpenseInput) {
  const { supabase, orgId, userId } = await getCompanyContext();

  if (!input.amount || input.amount <= 0) return { error: "Informe um valor maior que zero." };
  if (!input.spentAt.trim()) return { error: "Informe onde foi gasto." };

  const expenseDate = input.expenseDate || new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("expenses").insert({
    organization_id: orgId,
    amount: input.amount,
    spent_at: input.spentAt.trim(),
    note: input.note?.trim() || null,
    expense_date: expenseDate,
    reference_month: getReferenceMonth(expenseDate),
    source: "manual",
    created_by: userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const { supabase, orgId, role } = await getCompanyContext();

  if (role !== "cliente_admin") {
    return { error: "Apenas o admin da empresa pode excluir despesas." };
  }

  const { error } = await supabase
    .from("expenses")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

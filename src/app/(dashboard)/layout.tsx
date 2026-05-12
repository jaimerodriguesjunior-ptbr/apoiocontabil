import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { canAccessArea, getAreaForPath, getDefaultPathForRole, getAuthContext } from "@/lib/auth-context";
import { getPendingFixedExpenses } from "@/actions/despesas-fixas";
import FixedExpensesModal from "@/components/layout/FixedExpensesModal";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  if (!context.isActive) redirect("/login");
  if (context.organization?.is_blocked && context.role !== "contador") redirect("/login");

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "/dashboard";
  const area = getAreaForPath(pathname);

  if (!canAccessArea(context.role, area)) {
    redirect(getDefaultPathForRole(context.role));
  }

  const fixedExpenses =
    context.role === "cliente_admin"
      ? await getPendingFixedExpenses().catch(() => null)
      : null;

  return (
    <div className="app-shell flex">
      <Sidebar role={context.role} />
      <main className="app-main">{children}</main>
      {fixedExpenses && (
        <FixedExpensesModal
          referenceMonth={fixedExpenses.referenceMonth}
          items={fixedExpenses.items}
          totalInvoicedYear={fixedExpenses.totalInvoicedYear}
          totalExpensesYear={fixedExpenses.totalExpensesYear}
        />
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getAuthContext, getDefaultPathForRole } from "@/lib/auth-context";

export default async function EmpresaRedirectPage() {
  const context = await getAuthContext();
  redirect(context ? getDefaultPathForRole(context.role) : "/login");
}

import { redirect } from "next/navigation";
import { getAuthContext, getDefaultPathForRole } from "@/lib/auth-context";

export default async function RootPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  redirect(getDefaultPathForRole(context.role));
}

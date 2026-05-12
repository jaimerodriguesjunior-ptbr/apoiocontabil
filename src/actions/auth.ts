"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, getDefaultPathForRole } from "@/lib/auth-context";
import { redirect } from "next/navigation";

export async function login(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou senha inválidos." };
  }

  const context = await getAuthContext();

  if (context && !context.isActive) {
    await supabase.auth.signOut();
    return { error: "Usuario desativado. Fale com o administrador da empresa." };
  }

  if (context?.organization?.is_blocked && context.role !== "contador") {
    await supabase.auth.signOut();
    return { error: context.organization.blocked_reason || "Empresa bloqueada. Fale com o escritorio contabil." };
  }

  redirect(getDefaultPathForRole(context?.role || "cliente_admin"));
}

export async function register(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return { error: "Preencha todos os campos." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Este email já está cadastrado." };
    }
    return { error: error.message };
  }

  redirect("/empresas");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

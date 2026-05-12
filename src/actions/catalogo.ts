"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyOperatorContext } from "@/lib/auth-context";

export type CatalogItemType = "produto" | "servico";

type CatalogItemInput = {
  id?: string;
  name: string;
  itemType: CatalogItemType;
  price: number;
  ncm?: string;
};

async function getCompanyContext() {
  const context = await requireCompanyOperatorContext();
  return { supabase: context.supabase, orgId: context.orgId as string };
}

export async function getCatalogItems() {
  const { supabase, orgId } = await getCompanyContext();

  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getCatalogItem(id: string) {
  const { supabase, orgId } = await getCompanyContext();

  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function saveCatalogItem(input: CatalogItemInput) {
  const { supabase, orgId } = await getCompanyContext();

  const name = input.name.trim();
  if (!name) return { error: "Informe o nome do item." };

  if (!["produto", "servico"].includes(input.itemType)) {
    return { error: "Tipo de item invalido." };
  }

  const payload = {
    name,
    item_type: input.itemType,
    price: Number.isFinite(input.price) ? input.price : 0,
    ncm: input.ncm?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("catalog_items")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };

    revalidatePath("/catalogo");
    return { success: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      organization_id: orgId,
      ...payload,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { success: true, id: data.id };
}

export async function deleteCatalogItem(id: string) {
  const { supabase, orgId } = await getCompanyContext();

  const { error } = await supabase
    .from("catalog_items")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { success: true };
}

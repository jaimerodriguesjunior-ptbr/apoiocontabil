"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function getOrgId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, orgId: profile?.organization_id as string };
}

export async function getClients() {
  const { supabase, orgId } = await getOrgId();

  const { data, error } = await supabase
    .from("clients")
    .select(`*, client_services(*)`)
    .eq("organization_id", orgId)
    .eq("ativo", true)
    .order("nome");

  if (error) throw error;
  return data || [];
}

export async function getClient(id: string) {
  const { supabase, orgId } = await getOrgId();

  const { data, error } = await supabase
    .from("clients")
    .select(`*, client_services(*)`)
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function getClientsWithServices() {
  const { supabase, orgId } = await getOrgId();

  const { data, error } = await supabase
    .from("clients")
    .select(`*, client_services(*)`)
    .eq("organization_id", orgId)
    .eq("ativo", true)
    .order("nome");

  if (error) throw error;

  return (data || []).map((c: any) => ({
    ...c,
    client_services: (c.client_services || []).filter((s: any) => s.ativo),
  }));
}

type ServiceInput = {
  id?: string;
  descricao: string;
  valor_mensal?: number | null;
  codigo_servico?: string;
  cnae?: string;
  aliquota_iss?: number | null;
};

type ClientInput = {
  id?: string;
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  codigo_municipio_ibge?: string;
  services?: ServiceInput[];
};

export async function saveClient(data: ClientInput) {
  const { supabase, orgId } = await getOrgId();
  if (!orgId) return { error: "Organização não encontrada" };

  let clientId = data.id;
  const baseData = {
    nome: data.nome,
    cpf_cnpj: data.cpf_cnpj || null,
    email: data.email || null,
    telefone: data.telefone || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf || null,
    cep: data.cep || null,
    codigo_municipio_ibge: data.codigo_municipio_ibge || null,
  };

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update({ ...baseData, updated_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("organization_id", orgId);

    if (error) return { error: error.message };
  } else {
    const { data: newClient, error } = await supabase
      .from("clients")
      .insert({ organization_id: orgId, ...baseData })
      .select()
      .single();

    if (error) return { error: error.message };
    clientId = newClient.id;
  }

  if (data.services !== undefined && clientId) {
    await supabase
      .from("client_services")
      .delete()
      .eq("client_id", clientId)
      .eq("organization_id", orgId);

    const active = (data.services || []).filter((s) => s.descricao?.trim());
    if (active.length > 0) {
      const { error } = await supabase.from("client_services").insert(
        active.map((s) => ({
          organization_id: orgId,
          client_id: clientId,
          descricao: s.descricao,
          valor_mensal: s.valor_mensal || null,
          codigo_servico: s.codigo_servico || null,
          cnae: s.cnae || null,
          aliquota_iss: s.aliquota_iss || null,
        }))
      );
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/clientes");
  return { success: true, id: clientId };
}

export async function deleteClient(id: string) {
  const { supabase, orgId } = await getOrgId();

  const { error } = await supabase
    .from("clients")
    .update({ ativo: false })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/clientes");
  return { success: true };
}

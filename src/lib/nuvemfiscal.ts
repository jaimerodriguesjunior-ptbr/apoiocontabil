// Compatibilidade legada: apesar do nome e das variaveis NUVEMFISCAL_*, esta aplicacao
// usa exclusivamente a Nuvem Local Fiscal. A Nuvem Fiscal externa esta desativada.
export async function getNuvemFiscalToken(environment: "production" | "homologation" = "production") {
  const isProduction = environment === "production";
  const clientId = isProduction ? process.env.NUVEMFISCAL_PROD_CLIENT_ID : process.env.NUVEMFISCAL_HOM_CLIENT_ID;
  const clientSecret = isProduction ? process.env.NUVEMFISCAL_PROD_CLIENT_SECRET : process.env.NUVEMFISCAL_HOM_CLIENT_SECRET;
  const apiUrl = ((isProduction ? process.env.NUVEMFISCAL_PROD_URL : process.env.NUVEMFISCAL_HOM_URL) || "").replace(/\/+$/, "");
  const authUrl = isProduction
    ? process.env.NUVEMFISCAL_PROD_AUTH_URL || (apiUrl ? `${apiUrl}/oauth/token` : "")
    : process.env.NUVEMFISCAL_HOM_AUTH_URL || (apiUrl ? `${apiUrl}/oauth/token` : "");
  if (!clientId || !clientSecret) throw new Error(`Credenciais da Nuvem Local Fiscal (${environment}) nao encontradas no .env.local`);
  if (!authUrl) throw new Error(`URL da Nuvem Local Fiscal (${environment}) nao encontrada no .env.local`);
  const params = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "empresa nfce nfe nfse" });
  try {
    const response = await fetch(authUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Nuvem Local Fiscal] Erro ao autenticar:", errorText);
      throw new Error(`Falha na autenticacao (${response.status})`);
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("[Nuvem Local Fiscal] Erro na conexao:", error);
    throw error;
  }
}

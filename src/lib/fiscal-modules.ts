export const FISCAL_MODULES = ["nfse", "nfce", "nfe"] as const;

export type FiscalModule = (typeof FISCAL_MODULES)[number];

const labels: Record<FiscalModule, string> = {
  nfse: "NFS-e",
  nfce: "NFC-e",
  nfe: "NF-e",
};

export function parseFiscalModules(value?: string | null): FiscalModule[] {
  return String(value || "")
    .split("_")
    .filter((module): module is FiscalModule => FISCAL_MODULES.includes(module as FiscalModule));
}

export function getFiscalModule(value?: string | null): FiscalModule | null {
  const modules = parseFiscalModules(value);
  // Registros antigos podiam conter mais de um modulo. Mantemos o primeiro ate o
  // contador salvar novamente a empresa, quando a validacao exige um modulo unico.
  return modules[0] ?? null;
}

export function getFiscalModuleLabel(module: FiscalModule) {
  return labels[module];
}

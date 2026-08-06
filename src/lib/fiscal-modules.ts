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
  return modules.length === 1 ? modules[0] : null;
}

export function getFiscalModuleLabel(module: FiscalModule) {
  return labels[module];
}

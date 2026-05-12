"use client";

import { useState } from "react";
import { Building2, Users, Settings2 } from "lucide-react";

type Tab = "cadastro" | "usuarios" | "config";

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: "cadastro", label: "Cadastro", icon: Building2 },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "config", label: "Configurações", icon: Settings2 },
];

export default function EmpresaTabs({
  cadastroContent,
  usuariosContent,
  configContent,
}: {
  cadastroContent: React.ReactNode;
  usuariosContent: React.ReactNode;
  configContent: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("cadastro");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-[#ebe6dc] bg-[#faf8f2] p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition-colors ${
              activeTab === key
                ? "bg-white text-[#0f766e] shadow-sm border border-[#ded8cc]"
                : "text-[#716b61] hover:text-[#25231f]"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "cadastro" && cadastroContent}
      {activeTab === "usuarios" && usuariosContent}
      {activeTab === "config" && configContent}
    </div>
  );
}

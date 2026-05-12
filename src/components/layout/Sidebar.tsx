"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Boxes,
  FilePlus,
  FileText,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  ReceiptText,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-context";
import { createClient } from "@/utils/supabase/client";

const accountantNavItems = [
  { href: "/empresas", label: "Empresas", icon: Building2 },
];

const adminNavItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: Boxes },
  { href: "/despesas", label: "Despesas", icon: ReceiptText },
  { href: "/notas", label: "Notas Emitidas", icon: FileText },
];

const userNavItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/catalogo", label: "Catálogo", icon: Boxes },
  { href: "/notas", label: "Notas Emitidas", icon: FileText },
];

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navItems = role === "contador"
    ? accountantNavItems
    : role === "cliente_admin"
      ? adminNavItems
      : userNavItems;
  const subtitle = role === "contador" ? "Carteira de empresas" : "Emissão e controle fiscal";

  async function handleLogout() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navContent = (
    <>
      <div className="border-b border-[#ded8cc] px-5 py-5">
        <span className="block text-lg font-black text-[#25231f]">Apoio Contábil</span>
        <p className="mt-1 text-xs font-medium text-[#716b61]">{subtitle}</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-[#d9f3ee] text-[#115e59]"
                  : "text-[#625c52] hover:bg-[#f4f0e8] hover:text-[#25231f]"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#ded8cc] p-3">
        <button
          type="button"
          disabled={isSigningOut}
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-[#716b61] transition-colors hover:bg-[#f4f0e8] hover:text-[#25231f] disabled:opacity-50"
        >
          <LogOut size={17} />
          {isSigningOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#ded8cc] bg-[#fffdf8] md:flex"
      >
        {navContent}
      </aside>

      {role !== "contador" && (
        <>
          {/* Mobile top bar */}
          <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-[#ebe6dc] bg-[#fffdf8]/95 px-4 py-2.5 backdrop-blur md:hidden">
            <span className="text-sm font-black text-[#25231f]">Apoio Contábil</span>
            <button
              type="button"
              disabled={isSigningOut}
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-[#716b61] transition-colors hover:bg-[#f4f0e8] hover:text-[#25231f] disabled:opacity-50"
            >
              <LogOut size={14} />
              {isSigningOut ? "Saindo..." : "Sair"}
            </button>
          </div>

          <nav
            className="fixed inset-x-3 bottom-3 z-40 grid rounded-xl border border-[#ded8cc] bg-[#fffdf8]/95 p-1 shadow-[0_16px_40px_rgba(37,35,31,0.16)] backdrop-blur md:hidden"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
          >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          const shortLabel = label
            .replace("Início", "Nova Nota")
            .replace("Notas Emitidas", "Notas")
            .replace("Despesas", "Gastos")
            .replace("Catálogo", "Itens");

          // For the "Nova Nota" mobile button, use FilePlus icon to make it clear it's for emission
          const DisplayIcon = href === "/dashboard" ? FilePlus : Icon;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex h-14 min-w-0 w-full flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold overflow-hidden transition-colors ${
                isActive
                  ? "bg-[#0f766e] text-white"
                  : "text-[#716b61] hover:bg-[#f4f0e8] hover:text-[#25231f]"
              }`}
            >
              <DisplayIcon size={18} className="shrink-0" />
              <span className="w-full truncate text-center px-1">{shortLabel}</span>
            </Link>
          );
        })}
          </nav>
        </>
      )}
    </>
  );
}

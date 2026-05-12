import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplotec Contabilidade",
  description: "Portal de apoio para clientes da contabilidade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}

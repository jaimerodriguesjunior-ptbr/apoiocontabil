"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppButton({ 
  fullName, 
  email 
}: { 
  fullName: string; 
  email: string 
}) {
  function handleWhatsAppClick() {
    const baseUrl = window.location.origin;
    const loginUrl = `${baseUrl}/login?email=${encodeURIComponent(email)}`;
    
    const message = `Olá ${fullName}! Seu acesso ao sistema Apoio Contábil está pronto.\n\nSeu login: ${email}\n\nPara entrar, acesse pelo link abaixo:\n${loginUrl}`;
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  }

  return (
    <button
      type="button"
      onClick={handleWhatsAppClick}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
      title="Enviar acesso via WhatsApp"
    >
      <MessageCircle size={18} />
    </button>
  );
}

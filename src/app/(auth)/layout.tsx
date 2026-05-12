export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <img
            src="/Amplotec.jpg"
            alt="Amplotec Contabilidade"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-[0_14px_32px_rgba(37,35,31,0.16)]"
          />
          <h1 className="text-3xl font-black text-[#25231f]">Amplotec Contabilidade</h1>
          <p className="mt-2 text-sm font-medium text-[#716b61]">
            Portal de apoio para clientes da contabilidade
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

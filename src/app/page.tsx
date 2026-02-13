"use client";

import { useState } from "react";
import { registerCompanyInNuvemFiscal } from "@/actions/company";
import { Loader2, Save, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function Home() {
    const [activeTab, setActiveTab] = useState<'config' | 'emission'>('config');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Form States - Company
    const [company, setCompany] = useState({
        cpf_cnpj: "", razao_social: "", nome_fantasia: "", inscricao_estadual: "",
        inscricao_municipal: "", logradouro: "", numero: "", bairro: "",
        codigo_municipio_ibge: "4127700", // Default Toledo
        cidade: "Toledo", uf: "PR", cep: "", email_contato: "", telefone: "",
        nfse_login: "", nfse_password: ""
    });

    // Form States - Certificate
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState("");

    const handleSaveCompany = async () => {
        setLoading(true);
        setResult(null);
        try {
            // @ts-ignore
            const res = await registerCompanyInNuvemFiscal(company);
            if (res.success) {
                alert("Empresa Salva!");
                if (certFile) {
                    await handleUploadCert();
                }
            } else {
                alert("Erro: " + res.error);
            }
        } catch (e: any) {
            alert("Erro fatal: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadCert = async () => {
        if (!certFile || !company.cpf_cnpj || !certPassword) return alert("Faltam dados do certificado.");

        const formData = new FormData();
        formData.append("file", certFile);
        formData.append("cnpj", company.cpf_cnpj);
        formData.append("password", certPassword);

        try {
            const res = await fetch("/api/cert", { method: "POST", body: formData });
            if (res.ok) alert("Certificado enviado com sucesso!");
            else alert("Erro ao enviar certificado.");
        } catch (e) {
            alert("Erro no upload.");
        }
    };

    return (
        <main className="min-h-screen bg-stone-50 p-8 font-sans text-stone-800">
            <div className="max-w-4xl mx-auto space-y-8">

                <header className="flex justify-between items-center pb-6 border-b border-stone-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">NFS-e Toledo (Test)</h1>
                        <p className="text-stone-500 mt-1">Ambiente de Teste Nuvem Fiscal</p>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'config' ? 'bg-[#1A1A1A] text-[#FACC15]' : 'text-stone-500 hover:bg-stone-50'}`}
                        >
                            Configuração
                        </button>
                        <button
                            onClick={() => setActiveTab('emission')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'emission' ? 'bg-[#1A1A1A] text-[#FACC15]' : 'text-stone-500 hover:bg-stone-50'}`}
                        >
                            Emissão
                        </button>
                    </div>
                </header>

                {activeTab === 'config' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={20} /> Dados da Empresa</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input value={company.cpf_cnpj} onChange={e => setCompany({ ...company, cpf_cnpj: e.target.value })} placeholder="CNPJ" className="input-field" />
                            <input value={company.razao_social} onChange={e => setCompany({ ...company, razao_social: e.target.value })} placeholder="Razão Social" className="input-field" />
                            <input value={company.inscricao_municipal} onChange={e => setCompany({ ...company, inscricao_municipal: e.target.value })} placeholder="Inscrição Municipal" className="input-field" />
                            <input value={company.inscricao_estadual} onChange={e => setCompany({ ...company, inscricao_estadual: e.target.value })} placeholder="Inscrição Estadual" className="input-field" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input value={company.cep} onChange={e => setCompany({ ...company, cep: e.target.value })} placeholder="CEP" className="input-field" />
                            <input value={company.logradouro} onChange={e => setCompany({ ...company, logradouro: e.target.value })} placeholder="Logradouro" className="input-field col-span-2" />
                            <input value={company.numero} onChange={e => setCompany({ ...company, numero: e.target.value })} placeholder="Número" className="input-field" />
                            <input value={company.bairro} onChange={e => setCompany({ ...company, bairro: e.target.value })} placeholder="Bairro" className="input-field" />
                            <input value={company.cidade} onChange={e => setCompany({ ...company, cidade: e.target.value })} placeholder="Cidade" className="input-field" />
                            <input value={company.codigo_municipio_ibge} onChange={e => setCompany({ ...company, codigo_municipio_ibge: e.target.value })} placeholder="IBGE (4127700)" className="input-field" />
                            <input value={company.uf} onChange={e => setCompany({ ...company, uf: e.target.value })} placeholder="UF" className="input-field" />
                        </div>

                        <div className="border-t border-stone-100 pt-6">
                            <h3 className="font-bold mb-4">Credenciais NFS-e (Prefeitura)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input value={company.nfse_login} onChange={e => setCompany({ ...company, nfse_login: e.target.value })} placeholder="Login Prefeitura" className="input-field" />
                                <input value={company.nfse_password} onChange={e => setCompany({ ...company, nfse_password: e.target.value })} placeholder="Senha Prefeitura" type="password" className="input-field" />
                            </div>
                        </div>

                        <div className="border-t border-stone-100 pt-6 bg-stone-50 p-4 rounded-xl">
                            <h3 className="font-bold mb-4">Certificado Digital (.pfx)</h3>
                            <div className="flex gap-4 items-center">
                                <input type="file" accept=".pfx" onChange={e => setCertFile(e.target.files?.[0] || null)} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300" />
                                <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Senha Certificado" className="input-field" />
                            </div>
                        </div>

                        <button onClick={handleSaveCompany} disabled={loading} className="w-full bg-[#1A1A1A] text-[#FACC15] py-4 rounded-xl font-bold text-lg hover:scale-[1.01] transition disabled:opacity-70 flex justify-center items-center gap-2">
                            {loading ? <Loader2 className="animate-spin" /> : <Save />}
                            Salvar Configurações
                        </button>
                    </div>
                )}

                {activeTab === 'emission' && (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-stone-200 text-center">
                        <AlertCircle className="mx-auto text-stone-300 mb-4" size={48} />
                        <h2 className="text-xl font-bold text-stone-700">Em Breve</h2>
                        <p className="text-stone-400">Implemente a lógica de emissão após configurar a empresa.</p>
                    </div>
                )}

            </div>

            <style jsx global>{`
        .input-field {
            width: 100%;
            background-color: #F8F7F2;
            border-radius: 0.75rem; /* rounded-xl */
            padding: 0.75rem 1rem;
            border: 1px solid transparent;
            outline: none;
            transition: all 0.2s;
        }
        .input-field:focus {
            border-color: #FACC15;
            background-color: white;
            box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
        }
      `}</style>
        </main>
    );
}

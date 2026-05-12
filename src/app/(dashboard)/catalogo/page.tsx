import { Boxes, Package, Wrench } from "lucide-react";
import { getCatalogItems } from "@/actions/catalogo";
import CatalogoForm from "./CatalogoForm";
import DeleteCatalogItemButton from "./DeleteCatalogItemButton";

type CatalogItem = {
  id: string;
  name: string;
  item_type: "produto" | "servico";
  price?: number | null;
  ncm?: string | null;
};

function formatMoney(value?: number | null) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CatalogoPage() {
  const items = (await getCatalogItems()) as CatalogItem[];
  const servicos = items.filter((item) => item.item_type === "servico").length;
  const produtos = items.filter((item) => item.item_type === "produto").length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 md:space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#0f766e]">Itens da empresa</p>
        <h1 className="page-title mt-1 flex items-center gap-2"><Boxes size={24} /> Catálogo</h1>
        <p className="page-subtitle">Produtos e serviços usados para montar emissão de notas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <a href="#lista-itens" className="card flex items-center gap-3 p-4 hover:bg-[#faf9f5] transition-colors cursor-pointer">
          <div className="rounded-md bg-[#d9f3ee] p-2">
            <Wrench size={18} className="text-[#0f766e]" />
          </div>
          <div>
            <p className="text-xl font-black text-[#25231f]">{servicos}</p>
            <p className="text-xs font-bold uppercase text-[#716b61]">Serviços</p>
          </div>
        </a>
        <a href="#lista-itens" className="card flex items-center gap-3 p-4 hover:bg-[#faf9f5] transition-colors cursor-pointer">
          <div className="rounded-md bg-amber-50 p-2">
            <Package size={18} className="text-amber-700" />
          </div>
          <div>
            <p className="text-xl font-black text-[#25231f]">{produtos}</p>
            <p className="text-xs font-bold uppercase text-[#716b61]">Produtos</p>
          </div>
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.3fr]">
        <CatalogoForm />

        <div id="lista-itens" className="card p-0 scroll-mt-6">
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Boxes size={34} className="mx-auto mb-3 text-[#b8afa2]" />
              <p className="font-semibold text-[#716b61]">Nenhum item cadastrado ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#ebe6dc]">
              {items.map((item) => {
                const isService = item.item_type === "servico";

                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`rounded-md p-2 ${isService ? "bg-[#d9f3ee]" : "bg-amber-50"}`}>
                        {isService ? (
                          <Wrench size={17} className="text-[#0f766e]" />
                        ) : (
                          <Package size={17} className="text-amber-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-[#25231f]">{item.name}</p>
                        <p className="text-xs font-medium text-[#716b61]">
                          {isService ? "Serviço" : "Produto"} {item.ncm ? `- NCM ${item.ncm}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-black text-[#25231f]">{formatMoney(item.price)}</span>
                      <DeleteCatalogItemButton id={item.id} name={item.name} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PaginaHistorico.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Mercado do LarControl - Compras de Rancho e Gastos Extras.
 * -----------------------------------------------------------------------------
 */
import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { banco } from '@/firebase';
import { formatarMoeda } from '@/utils/utilFormato';
import {
  History,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ProdutoHistorico {
  nome: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  subtotal: number;
}

interface CompraHistorico {
  id: string;
  dataCompra: string;
  mercado: string;
  localizacao: string;
  tetoGasto: number;
  totalGasto: number;
  modo: string;
  compradoPor: string;
  produtos: ProdutoHistorico[];
}

interface ComparativoProduto {
  produto: string;
  precoAtual: number;
  precoAnterior: number;
  diferenca: number;
  status: 'mais_barato' | 'mais_caro';
  dataAtual: string;
  dataAnterior: string;
}

export function PaginaHistorico() {
  const [compras, setCompras] = useState<CompraHistorico[]>([]);
  const [compraExpandida, setCompraExpandida] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(banco, 'historico_compras'),
      orderBy('dataCompra', 'desc'),
      limit(50)
    );

    const cancelar = onSnapshot(
      q,
      (snapshot) => {
        const lista: CompraHistorico[] = [];
        snapshot.forEach((docSnap) => {
          const dados = docSnap.data();
          lista.push({
            id: docSnap.id,
            dataCompra: dados.dataCompra || '',
            mercado: dados.mercado || '',
            localizacao: dados.localizacao || '',
            tetoGasto: dados.tetoGasto || 0,
            totalGasto: dados.totalGasto || 0,
            modo: dados.modo || 'rancho',
            compradoPor: dados.compradoPor || 'Usuário',
            produtos: Array.isArray(dados.produtos) ? dados.produtos : [],
          });
        });
        setCompras(lista);
      },
      (erro) => {
        console.error('Erro ao buscar histórico de compras:', erro);
      }
    );

    return () => cancelar();
  }, []);

  // --- Algoritmo Dashboard: Comparativo Inteligente de Preços ---
  const comparativos = useMemo(() => {
    if (compras.length < 2) return [];

    const analises: ComparativoProduto[] = [];
    const ultimaCompra = compras[0];
    const comprasAnteriores = compras.slice(1);

    if (!ultimaCompra?.produtos || ultimaCompra.produtos.length === 0) return [];

    ultimaCompra.produtos.forEach((prodAtual) => {
      const nomeNormalizadoAtual = prodAtual.nome.trim().toLowerCase();

      for (const compraAnt of comprasAnteriores) {
        const prodAnterior = compraAnt.produtos?.find(
          (p) => p.nome.trim().toLowerCase() === nomeNormalizadoAtual
        );

        if (prodAnterior && prodAnterior.precoUnitario > 0) {
          const diff = prodAtual.precoUnitario - prodAnterior.precoUnitario;
          
          if (diff !== 0) {
            analises.push({
              produto: prodAtual.nome,
              precoAtual: prodAtual.precoUnitario,
              precoAnterior: prodAnterior.precoUnitario,
              diferenca: Math.abs(diff),
              status: diff < 0 ? 'mais_barato' : 'mais_caro',
              dataAtual: ultimaCompra.dataCompra,
              dataAnterior: compraAnt.dataCompra,
            });
          }
          break; // Compara com o registro imediatamente anterior encontrado
        }
      }
    });

    return analises;
  }, [compras]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <History className="text-teal-600" />
          Dashboard & Histórico de Compras
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe seus gastos guardados e o comparativo de preços entre compras.
        </p>
      </div>

      {/* --- DASHBOARD: MÓDULO COMPARATIVO --- */}
      <div className="cartao p-5 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-teal-400 flex items-center gap-2">
          <ShoppingBag size={20} /> Comparativo da Última Compra
        </h2>

        {comparativos.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Faça pelo menos duas compras registradas com produtos em comum para visualizar o comparativo automático de preços.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comparativos.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  item.status === 'mais_barato'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                    : 'bg-red-950/40 border-red-800 text-red-200'
                }`}
              >
                {item.status === 'mais_barato' ? (
                  <TrendingDown className="text-emerald-400 shrink-0 mt-1" size={20} />
                ) : (
                  <TrendingUp className="text-red-400 shrink-0 mt-1" size={20} />
                )}

                <div className="text-xs space-y-0.5">
                  <strong className="text-sm font-semibold block text-white">
                    {item.produto}
                  </strong>
                  {item.status === 'mais_barato' ? (
                    <p>
                      Você <span className="font-bold text-emerald-400">economizou {formatarMoeda(item.diferenca)}</span> por unidade em relação a {item.dataAnterior}.
                    </p>
                  ) : (
                    <p>
                      Pagou <span className="font-bold text-red-400">{formatarMoeda(item.diferenca)} a mais</span> por unidade em relação a {item.dataAnterior}.
                    </p>
                  )}
                  <p className="text-slate-400 pt-1">
                    Atual: {formatarMoeda(item.precoAtual)} | Anterior: {formatarMoeda(item.precoAnterior)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- HISTÓRICO DE COMPRAS CONCLUÍDAS --- */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compras Guardadas</h2>

        {compras.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <History size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma compra finalizada no histórico ainda.</p>
          </div>
        ) : (
          compras.map((compra) => {
            const aberta = compraExpandida === compra.id;
            return (
              <div key={compra.id} className="cartao overflow-hidden transition-all p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <div
                  onClick={() => setCompraExpandida(aberta ? null : compra.id)}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-800 font-bold dark:bg-teal-950 dark:text-teal-300">
                        {compra.modo.toUpperCase()}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">
                        {compra.mercado}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {compra.dataCompra}
                      </span>
                      {compra.localizacao && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {compra.localizacao}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-teal-700 dark:text-teal-400">
                        {formatarMoeda(compra.totalGasto)}
                      </p>
                      {compra.tetoGasto > 0 && (
                        <p className="text-xs text-slate-400">
                          Teto: {formatarMoeda(compra.tetoGasto)}
                        </p>
                      )}
                    </div>
                    {aberta ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                  </div>
                </div>

                {/* Detalhes expandidos dos produtos daquela compra */}
                {aberta && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-slate-400">
                      Produtos comprados ({compra.produtos.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {compra.produtos.map((p, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{p.nome}</p>
                            <p className="text-slate-400">
                              {p.quantidade} {p.unidade} × {formatarMoeda(p.precoUnitario)}
                            </p>
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {formatarMoeda(p.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * PaginaHistorico.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Mercado do LarControl - Compras de Rancho e Gastos Extras.
 * -----------------------------------------------------------------------------
 */
import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
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
  Package,
  Search,
  Filter,
  X,
  Upload,
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
  const [importando, setImportando] = useState(false);

  // --- Estados para os Filtros ---
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroMercado, setFiltroMercado] = useState('');
  const [filtroData, setFiltroData] = useState('');

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

  // --- Função para processar e importar o CSV de Notas Fiscais ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setImportando(true);
    const leitor = new FileReader();

    leitor.onload = async (e) => {
      try {
        const conteudo = e.target?.result as string;
        const linhas = conteudo.split('\n');
        if (linhas.length < 2) {
          alert('Arquivo CSV vazio ou inválido.');
          setImportando(false);
          return;
        }

        const cabecalho = linhas[0].split(';').map((h) => h.trim());
        
        const idxRazao = cabecalho.indexOf('Emitente_RazaoSocial');
        const idxChave = cabecalho.indexOf('Chave_NFCe');
        const idxData = cabecalho.indexOf('Data_Emissao');
        const idxDescricao = cabecalho.indexOf('Item_Descricao');
        const idxQtd = cabecalho.indexOf('Item_Quantidade');
        const idxUn = cabecalho.indexOf('Item_UN');
        const idxPrecoUnit = cabecalho.indexOf('Item_Valor_Unitario');
        const idxValorTotalItem = cabecalho.indexOf('Item_Valor_Total');
        const idxNotaTotal = cabecalho.indexOf('Nota_Valor_Total_RS');

        const notasMap: { [chave: string]: any } = {};

        for (let i = 1; i < linhas.length; i++) {
          const linha = linhas[i].trim();
          if (!linha) continue;

          const colunas = linha.split(';');
          if (colunas.length < cabecalho.length) continue;

          const chave = colunas[idxChave] || `nota_${i}`;
          const mercado = colunas[idxRazao] || 'Estabelecimento Desconhecido';
          const dataEmissaoCompleta = colunas[idxData] || '';
          const dataCompra = dataEmissaoCompleta.split(' ')[0] || new Date().toISOString().split('T')[0];
          
          const produtoNome = colunas[idxDescricao] || 'Produto';
          
          let qtdStr = colunas[idxQtd] || '1';
          qtdStr = qtdStr.replace(/[^0-9,.-]/g, '').replace(',', '.');
          const quantidade = parseFloat(qtdStr) || 1;

          const unidade = colunas[idxUn] || 'un';

          const precoUnitStr = (colunas[idxPrecoUnit] || '0').replace('.', '').replace(',', '.');
          const precoUnitario = parseFloat(precoUnitStr) || 0;

          const subtotalStr = (colunas[idxValorTotalItem] || '0').replace('.', '').replace(',', '.');
          const subtotal = parseFloat(subtotalStr) || (quantidade * precoUnitario);

          const notaTotalStr = (colunas[idxNotaTotal] || '0').replace('.', '').replace(',', '.');
          const totalNota = parseFloat(notaTotalStr) || 0;

          if (!notasMap[chave]) {
            notasMap[chave] = {
              mercado: mercado,
              dataCompra: dataCompra,
              localizacao: '',
              tetoGasto: 0,
              totalGasto: totalNota,
              modo: 'rancho',
              compradoPor: 'Importação CSV',
              produtos: [],
            };
          }

          notasMap[chave].produtos.push({
            nome: produtoNome,
            quantidade: quantidade,
            unidade: unidade,
            precoUnitario: precoUnitario,
            subtotal: subtotal,
          });

          if (totalNota === 0) {
            notasMap[chave].totalGasto += subtotal;
          }
        }

        let totalImportadas = 0;
        for (const chave in notasMap) {
          const dadosNota = notasMap[chave];
          const docRef = doc(banco, 'historico_compras', chave.replace(/[^a-zA-Z0-9]/g, '_'));
          await setDoc(docRef, dadosNota, { merge: true });
          totalImportadas++;
        }

        alert(`${totalImportadas} nota(s) fiscal(is) importada(s) com sucesso para o histórico!`);
      } catch (erro) {
        console.error('Erro ao processar arquivo CSV:', erro);
        alert('Erro ao processar o arquivo CSV. Verifique o formato.');
      } finally {
        setImportando(false);
        event.target.value = '';
      }
    };

    leitor.readAsText(arquivo, 'UTF-8');
  };

  const adicionarDespensaDoHistorico = async (produto: ProdutoHistorico, compra: CompraHistorico) => {
    try {
      await addDoc(collection(banco, 'despensa'), {
        nome: produto.nome,
        categoria: 'Armários',
        quantidade: produto.quantidade || 1,
        unidade: produto.unidade || 'un',
        status: 'Fechado',
        ultimoPreco: produto.precoUnitario || 0,
        ultimoLocal: compra.mercado || 'Não informado',
        ultimaCompra: serverTimestamp(),
      });
      alert(`"${produto.nome}" foi adicionado à despensa com sucesso!`);
    } catch (erro) {
      console.error('Erro ao enviar item para a despensa:', erro);
    }
  };

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
          break;
        }
      }
    });

    return analises;
  }, [compras]);

  // --- Lógica de Filtragem do Histórico ---
  const comprasFiltradas = useMemo(() => {
    return compras.filter((compra) => {
      const matchMercado = filtroMercado
        ? compra.mercado.toLowerCase().includes(filtroMercado.toLowerCase())
        : true;

      const matchData = filtroData ? compra.dataCompra === filtroData : true;

      const matchProduto = filtroTexto
        ? compra.produtos.some((p) => p.nome.toLowerCase().includes(filtroTexto.toLowerCase()))
        : true;

      return matchMercado && matchData && matchProduto;
    });
  }, [compras, filtroTexto, filtroMercado, filtroData]);

  // Lista única de mercados preservada do código original
  const listaMercados = useMemo(() => {
    const mercados = new Set(compras.map((c) => c.mercado).filter(Boolean));
    return Array.from(mercados);
  }, [compras]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="text-teal-600" />
            Dashboard & Histórico de Compras
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Acompanhe seus gastos guardados e o comparativo de preços entre compras.
          </p>
        </div>

        {/* Botão de Importação CSV */}
        <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
          importando 
            ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
        }`}>
          <Upload size={18} />
          {importando ? 'Importando...' : 'Importar Nota (CSV)'}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importando}
            className="hidden"
          />
        </label>
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

      {/* --- HISTÓRICO DE COMPRAS CONCLUÍDAS & FILTROS --- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compras Guardadas</h2>
          
          {(filtroTexto || filtroMercado || filtroData) && (
            <button
              onClick={() => { setFiltroTexto(''); setFiltroMercado(''); setFiltroData(''); }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <X size={14} /> Limpar filtros
            </button>
          )}
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por produto..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por estabelecimento..."
              value={filtroMercado}
              onChange={(e) => setFiltroMercado(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {comprasFiltradas.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <History size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma compra encontrada com os filtros informados.</p>
          </div>
        ) : (
          comprasFiltradas.map((compra) => {
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {formatarMoeda(p.subtotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => adicionarDespensaDoHistorico(p, compra)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                              title="Adicionar à Despensa"
                            >
                              <Package size={16} />
                            </button>
                          </div>
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

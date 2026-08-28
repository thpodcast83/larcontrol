import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import { useAuth } from '@/contextos/ContextoAuth';
import type { ItemCarrinho, ItemDespensa } from '@/tipos';
import { formatarMoeda, formatarData } from '@/utils/utilFormato';
import { obterGeolocalizacao } from '@/utils/utilGeolocalizacao';
import { enviarNotificacao, solicitarPermissaoNotificacao } from '@/utils/utilNotificacao';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import { BotaoImportar } from '@/componentes/BotaoImportar';
import type { ItemImportado } from '@/utils/utilParser';
import {
  ShoppingCart,
  Plus,
  Trash2,
  MapPin,
  TrendingUp,
  TrendingDown,
  FileText,
  Package,
  AlertCircle,
  Wallet,
  Search,
} from 'lucide-react';

export function PaginaMercado() {
  const { usuario } = useAuth();

  // --- Estados principais ---
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [despensa, setDespensa] = useState<ItemDespensa[]>([]);
  const [modo, setModo] = useState<'rancho' | 'extras'>('rancho');
  const [teto, setTeto] = useState<number>(0);
  const [tetoInput, setTetoInput] = useState('');
  const [mercado, setMercado] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [alertaDespensa, setAlertaDespensa] = useState<string | null>(null);

  // --- Otimizações de busca e renderização mobile ---
  const [buscaInput, setBuscaInput] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [limiteExibicao, setLimiteExibicao] = useState(30);

  // Form de novo item
  const [novoNome, setNovoNome] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [novaUnidade, setNovaUnidade] = useState<'un' | 'kg' | 'g'>('un');
  const [novoPreco, setNovoPreco] = useState('');

  // 1. Debounce para o input de busca (atrasa 300ms a filtragem pesada para não travar o teclado mobile)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(buscaInput);
      setLimiteExibicao(30); // Reseta a paginação ao buscar
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  useEffect(() => {
    const q = query(collection(banco, 'mercado'), orderBy('adicionadoEm', 'desc'));

    const cancelar = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
          const dados = change.doc.data();
          const adicionadoPor = dados.adicionadoPor || 'Membro da casa';
          const nomeItem = dados.nome || 'Novo item';
          const subtotal = dados.subtotal || 0;

          if (usuario?.nome && adicionadoPor.toLowerCase() !== usuario.nome.toLowerCase()) {
            try {
              enviarNotificacao(
                '🛒 Novo item no carrinho!',
                `${adicionadoPor} acabou de adicionar: ${nomeItem} (${formatarMoeda(subtotal)})`
              );
            } catch (err) {
              console.warn('Falha ao exibir notificação:', err);
            }
          }
        }
      });

      const lista: ItemCarrinho[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          quantidade: dados.quantidade || 0,
          unidade: dados.unidade || 'un',
          precoUnitario: dados.precoUnitario || 0,
          subtotal: dados.subtotal || 0,
          modo: dados.modo || 'rancho',
          mercado: dados.mercado || '',
          adicionadoPor: dados.adicionadoPor || '',
          adicionadoEm: dados.adicionadoEm?.toMillis?.() || 0,
        });
      });
      setItens(lista);
    });

    return () => cancelar();
  }, [usuario?.nome]);

  useEffect(() => {
    const q = query(collection(banco, 'despensa'));
    const cancelar = onSnapshot(q, (snapshot) => {
      const lista: ItemDespensa[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          categoria: dados.categoria || 'Armários',
          quantidade: dados.quantidade || 0,
          unidade: dados.unidade || 'un',
          status: dados.status || 'Fechado',
          ultimoPreco: dados.ultimoPreco || 0,
          ultimoLocal: dados.ultimoLocal || '',
          ultimaCompra: dados.ultimaCompra?.toMillis?.() || 0,
        });
      });
      setDespensa(lista);
    });
    return () => cancelar();
  }, []);

  useEffect(() => {
    solicitarPermissaoNotificacao();
  }, []);

  // 2. Mapeamento da Despensa usando Map O(1) para comparação rápida sem travar o loop
  const mapaDespensa = useMemo(() => {
    const map = new Map<string, ItemDespensa>();
    despensa.forEach((item) => map.set(item.nome.toLowerCase(), item));
    return map;
  }, [despensa]);

  // 3. Memoização dos cálculos totais do modo ativo
  const itensModo = useMemo(() => itens.filter((i) => i.modo === modo), [itens, modo]);

  const { totalGasto, totalQuantidade } = useMemo(() => {
    return itensModo.reduce(
      (acc, i) => {
        acc.totalGasto += i.subtotal;
        acc.totalQuantidade += i.quantidade;
        return acc;
      },
      { totalGasto: 0, totalQuantidade: 0 }
    );
  }, [itensModo]);

  const saldo = teto - totalGasto;
  const percentual = teto > 0 ? Math.min((totalGasto / teto) * 100, 100) : 0;

  // 4. Filtragem por busca otimizada
  const itensFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    if (!termo) return itensModo;
    return itensModo.filter((item) => item.nome.toLowerCase().includes(termo));
  }, [itensModo, buscaDebounced]);

  // Items visíveis limitados para salvar memória no celular
  const itensExibidos = useMemo(() => {
    return itensFiltrados.slice(0, limiteExibicao);
  }, [itensFiltrados, limiteExibicao]);

  const carregarMais = () => {
    setLimiteExibicao((prev) => prev + 30);
  };

  const definirTeto = () => {
    const valor = parseFloat(tetoInput.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) {
      setTeto(valor);
      setTetoInput('');
    }
  };

  const obterLocal = async () => {
    try {
      const geo = await obterGeolocalizacao();
      setLocalizacao(geo.texto);
    } catch {
      // Silencioso
    }
  };

  const calcularSubtotal = (qtd: number, unidade: string, preco: number): number => {
    if (unidade === 'g') return (qtd / 1000) * preco;
    return qtd * preco;
  };

  const adicionarItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoNome.trim() || !novoPreco) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setModalAberto(false);

    const nomeItem = novoNome.trim();
    const qtdStr = novaQtd;
    const unidadeItem = novaUnidade;
    const precoStr = novoPreco;

    setNovoNome('');
    setNovaQtd('1');
    setNovaUnidade('un');
    setNovoPreco('');

    try {
      const qtd = parseFloat(qtdStr.replace(',', '.')) || 0;
      const preco = parseFloat(precoStr.replace(',', '.')) || 0;
      const subtotal = calcularSubtotal(qtd, unidadeItem, preco);

      const itemDespensa = mapaDespensa.get(nomeItem.toLowerCase());

      if (itemDespensa) {
        const precoAnterior = itemDespensa.ultimoPreco || 0;
        const status = itemDespensa.status || 'Fechado';
        const qtdDespensa = itemDespensa.quantidade || 0;
        const localAnterior = itemDespensa.ultimoLocal || 'local anterior';

        let comparacao = '';
        if (precoAnterior > 0) {
          if (preco > precoAnterior) {
            comparacao = `MAIS CARO que a última compra (era ${formatarMoeda(precoAnterior)} no ${localAnterior}).`;
          } else if (preco < precoAnterior) {
            comparacao = `MAIS BARATO que a última compra (era ${formatarMoeda(precoAnterior)} no ${localAnterior}).`;
          } else {
            comparacao = `Mesmo preço da última compra no ${localAnterior}.`;
          }
        }

        setAlertaDespensa(
          `No mês anterior você comprou ${qtdDespensa} ${itemDespensa.unidade} de "${nomeItem}" a ${formatarMoeda(precoAnterior)} no ${localAnterior}. ` +
          `Status atual na despensa: ${qtdDespensa} ${itemDespensa.unidade} (${status}). ${comparacao}`
        );
      } else {
        setAlertaDespensa(null);
      }

      await addDoc(collection(banco, 'mercado'), {
        nome: nomeItem,
        quantidade: qtd,
        unidade: unidadeItem,
        precoUnitario: preco,
        subtotal,
        modo,
        mercado: mercado || 'Não informado',
        adicionadoPor: usuario?.nome || 'Usuário',
        adicionadoEm: serverTimestamp(),
        localizacao,
      });

    } catch (erro) {
      console.error("Erro ao adicionar produto:", erro);
    }
  };

  const removerItem = async (id: string) => {
    await deleteDoc(doc(banco, 'mercado', id));
  };

  const importarItens = async (itensImportados: ItemImportado[]) => {
    const tamanhoLote = 500;
    const colecaoRef = collection(banco, 'mercado');

    for (let i = 0; i < itensImportados.length; i += tamanhoLote) {
      const lote = writeBatch(banco);
      const fatia = itensImportados.slice(i, i + tamanhoLote);

      fatia.forEach((item) => {
        const novoDocRef = doc(colecaoRef);
        const subtotal = calcularSubtotal(item.quantidade, item.unidade, item.preco);

        lote.set(novoDocRef, {
          nome: item.nome,
          quantidade: item.quantidade,
          unidade: item.unidade,
          precoUnitario: item.preco,
          subtotal,
          modo,
          mercado: mercado || 'Importado',
          adicionadoPor: usuario?.nome || 'Usuário',
          adicionadoEm: serverTimestamp(),
          localizacao,
        });
      });

      await lote.commit();
    }
  };

  const gerarPdf = () => {
    const colunas = ['Produto', 'Qtd', 'Un.', 'Preço Unit.', 'Subtotal'];
    const linhas = itensModo.map((i) => [
      i.nome,
      i.quantidade.toString(),
      i.unidade,
      formatarMoeda(i.precoUnitario),
      formatarMoeda(i.subtotal),
    ]);

    gerarPdfGenerico(
      {
        titulo: modo === 'rancho' ? 'Relatório de Rancho (VR/VA)' : 'Relatório de Gastos Extras',
        subtitulo: `Mercado: ${mercado || 'Não informado'} | Local: ${localizacao || 'N/A'}`,
        colunas,
        linhas,
        total: `TOTAL: ${formatarMoeda(totalGasto)}`,
      },
      `relatorio-${modo}-larcontrol.pdf`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="text-primaria-700" />
          Mercado
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Compras de rancho e gastos extras com sincronização em tempo real.
        </p>
      </div>

      {/* Resumo/Total no topo */}
      <div className="cartao-destaque bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between p-5 rounded-2xl shadow-lg">
        <div>
          <span className="text-teal-200 text-xs font-semibold uppercase tracking-wider">
            Total {modo === 'rancho' ? 'do Rancho' : 'dos Gastos Extras'}
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-0.5">
            {formatarMoeda(totalGasto)}
          </h2>
        </div>
        <div className="text-right">
          <span className="badge bg-teal-700/60 text-teal-100 text-xs px-3 py-1 rounded-full font-medium">
            {itensModo.length} itens ({totalQuantidade} un/kg)
          </span>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => {
            setModo('rancho');
            setLimiteExibicao(30);
          }}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'rancho' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Rancho (VR/VA)
        </button>
        <button
          onClick={() => {
            setModo('extras');
            setLimiteExibicao(30);
          }}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'extras' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Gastos Extras
        </button>
      </div>

      <div className="cartao-destaque">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Wallet size={18} className="text-teal-600 dark:text-teal-400" />
            Teto de Gastos
          </h2>
          {teto > 0 && (
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Saldo: <span className={saldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{formatarMoeda(saldo)}</span>
            </span>
          )}
        </div>

        {teto === 0 ? (
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Valor total do ticket (ex: 1500)"
              value={tetoInput}
              onChange={(e) => setTetoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && definirTeto()}
              className="campo-entrada flex-1"
            />
            <button onClick={definirTeto} className="botao-primario">
              Definir
            </button>
          </div>
        ) : (
          <div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentual >= 100 ? 'bg-red-500' : percentual >= 80 ? 'bg-amber-500' : 'bg-teal-600'
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{formatarMoeda(totalGasto)} gastos</span>
              <span className="text-slate-600 dark:text-slate-400">{formatarMoeda(teto)} teto</span>
            </div>
            {percentual >= 100 && (
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold mt-2 flex items-center gap-1">
                <AlertCircle size={16} />
                Teto de gastos ultrapassado!
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Nome do mercado</label>
          <input
            type="text"
            placeholder="Ex: Supermercado Bom Preço"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            className="campo-entrada"
          />
        </div>
        <div>
          <label className="rotulo">Geolocalização</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              placeholder="Toque em obter localização"
              value={localizacao}
              className="campo-entrada flex-1"
            />
            <button onClick={obterLocal} className="botao-secundario px-3" type="button">
              <MapPin size={18} />
            </button>
          </div>
        </div>
      </div>

      {alertaDespensa && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Package className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-1">Alerta da Despensa</p>
            <p className="text-amber-700 dark:text-amber-300 text-sm">{alertaDespensa}</p>
          </div>
          <button onClick={() => setAlertaDespensa(null)} className="text-amber-400 hover:text-amber-600 ml-auto">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalAberto(true)} className="botao-primario">
          <Plus size={18} />
          Adicionar item
        </button>
        <BotaoImportar onImportar={importarItens} />
        <button onClick={gerarPdf} className="botao-secundario">
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      {/* Input de busca otimizado com debounce */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar no carrinho (ex: Leite)..."
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          className="campo-entrada pl-10"
        />
        {buscaInput && (
          <button
            onClick={() => {
              setBuscaInput('');
              setBuscaDebounced('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {itensExibidos.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
            <p>
              {buscaDebounced
                ? `Nenhum produto encontrado para "${buscaDebounced}".`
                : 'Carrinho vazio. Adicione itens para começar.'}
            </p>
          </div>
        ) : (
          itensExibidos.map((item) => {
            const itemDespensa = mapaDespensa.get(item.nome.toLowerCase());
            const maisCaro = itemDespensa && item.precoUnitario > itemDespensa.ultimoPreco;
            const maisBarato = itemDespensa && item.precoUnitario < itemDespensa.ultimoPreco;

            return (
              <div key={item.id} className="cartao flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.nome}</h3>
                    {maisCaro && (
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        <TrendingUp size={12} /> Mais caro
                      </span>
                    )}
                    {maisBarato && (
                      <span className="badge bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <TrendingDown size={12} /> Mais barato
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.quantidade} {item.unidade} × {formatarMoeda(item.precoUnitario)} = {' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{formatarMoeda(item.subtotal)}</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Por {item.adicionadoPor} • {formatarData(item.adicionadoEm)}
                  </p>
                </div>
                <button
                  onClick={() => removerItem(item.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  aria-label="Remover item"
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}

        {/* Botão de carregar mais itens caso a lista seja muito longa */}
        {itensFiltrados.length > limiteExibicao && (
          <div className="text-center pt-2">
            <button onClick={carregarMais} className="botao-secundario text-sm py-2 px-4">
              Carregar mais ({itensFiltrados.length - limiteExibicao} restantes)
            </button>
          </div>
        )}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Adicionar item ao carrinho">
        <form onSubmit={adicionarItem} className="space-y-4">
          <div>
            <label className="rotulo">Nome do produto</label>
            <input
              type="text"
              list="sugestoes-despensa"
              placeholder="Ex: Leite Integral"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="campo-entrada"
              autoFocus
              required
            />
            <datalist id="sugestoes-despensa">
              {despensa.map((d) => (
                <option key={d.id} value={d.nome} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Quantidade</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 2 ou 0.450"
                value={novaQtd}
                onChange={(e) => setNovaQtd(e.target.value)}
                className="campo-entrada"
                required
              />
            </div>
            <div>
              <label className="rotulo">Unidade</label>
              <select
                value={novaUnidade}
                onChange={(e) => setNovaUnidade(e.target.value as 'un' | 'kg' | 'g')}
                className="campo-entrada"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="g">Grama (g)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="rotulo">
              {novaUnidade === 'un' ? 'Preço unitário (R$)' : 'Preço por kg (R$)'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 49.90"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              className="campo-entrada"
              required
            />
          </div>
          {novoPreco && novaQtd && (
            <div className="bg-teal-50 dark:bg-slate-800/80 rounded-xl p-3 text-sm border border-teal-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Subtotal: </span>
              <span className="font-bold text-teal-700 dark:text-teal-300">
                {formatarMoeda(
                  calcularSubtotal(
                    parseFloat(novaQtd.replace(',', '.')) || 0,
                    novaUnidade,
                    parseFloat(novoPreco.replace(',', '.')) || 0
                  )
                )}
              </span>
            </div>
          )}
          <button type="submit" className="botao-primario w-full">
            <Plus size={18} />
            Adicionar ao carrinho
          </button>
        </form>
      </Modal>
    </div>
  );
}

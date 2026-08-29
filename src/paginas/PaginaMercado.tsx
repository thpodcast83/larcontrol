/**
 * PaginaMercado.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Mercado do LarControl - Compras de Rancho e Gastos Extras.
 * -----------------------------------------------------------------------------
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import { useAuth } from '@/contextos/ContextoAuth';
import type { ItemCarrinho } from '@/tipos';
import { formatarMoeda } from '@/utils/utilFormato';
import { obterGeolocalizacao } from '@/utils/utilGeolocalizacao';
import { Modal } from '@/componentes/Modal';
import {
  ShoppingCart,
  Plus,
  Trash2,
  MapPin,
  Wallet,
  Search,
  CheckCircle,
  Calendar,
  Edit2,
  Save,
  Tag,
  PlusCircle,
} from 'lucide-react';

function ItemCarrinhoCard({ item }: { item: ItemCarrinho }) {
  const [qtdEditada, setQtdEditada] = useState(item.quantidade ? item.quantidade.toString() : '1');
  const [unidadeEditada, setUnidadeEditada] = useState<'un' | 'kg' | 'g'>(item.unidade || 'un');
  const [precoEditado, setPrecoEditado] = useState(item.precoUnitario ? item.precoUnitario.toString() : '');

  const qNum = parseFloat(qtdEditada.replace(',', '.')) || 0;
  const pNum = parseFloat(precoEditado.replace(',', '.')) || 0;

  let subtotalCalculado = qNum * pNum;
  if (unidadeEditada === 'g') {
    subtotalCalculado = (qNum / 1000) * pNum;
  }

  const handleSalvarNoCarrinho = async () => {
    await updateDoc(doc(banco, 'carrinho_atual', item.id), {
      quantidade: qNum,
      unidade: unidadeEditada,
      precoUnitario: pNum,
      subtotal: subtotalCalculado,
    });
  };

  const removerItem = async () => {
    await deleteDoc(doc(banco, 'carrinho_atual', item.id));
  };

  return (
    <div className="cartao flex flex-col gap-3 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.nome}</h3>
          <p className="text-xs text-slate-400">Adicionado por {item.adicionadoPor}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-teal-600 dark:text-teal-400 font-bold">
            Subtotal: {formatarMoeda(subtotalCalculado)}
          </span>
          <button onClick={removerItem} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir item">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
        <div>
          <label className="text-[10px] text-slate-400 block">Quantidade / Peso</label>
          <input
            type="text"
            inputMode="decimal"
            value={qtdEditada}
            onChange={(e) => setQtdEditada(e.target.value)}
            className="campo-entrada text-sm py-1.5 px-2"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">Unidade</label>
          <select
            value={unidadeEditada}
            onChange={(e) => setUnidadeEditada(e.target.value as 'un' | 'kg' | 'g')}
            className="campo-entrada text-sm py-1.5 px-2"
          >
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilo (kg)</option>
            <option value="g">Grama (g)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">Preço Unitário (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={precoEditado}
            onChange={(e) => setPrecoEditado(e.target.value)}
            className="campo-entrada text-sm py-1.5 px-2"
          />
        </div>

        <div className="flex items-end h-full pt-2 sm:pt-0">
          <button
            onClick={handleSalvarNoCarrinho}
            className="botao-primario text-xs w-full py-2"
            type="button"
          >
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaginaMercado() {
  const { usuario } = useAuth();

  const [itensCarrinho, setItensCarrinho] = useState<ItemCarrinho[]>([]);
  const [modo, setModo] = useState<'rancho' | 'extras'>('rancho');

  const [teto, setTeto] = useState<number>(0);
  const [editandoTeto, setEditandoTeto] = useState(false);
  const [tetoInput, setTetoInput] = useState('');

  const [dataCompra, setDataCompra] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mercado, setMercado] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [salvandoCompra, setSalvandoCompra] = useState(false);

  // Cache local dos produtos do banco para busca instantânea e sem gastar cota
  const [catalogoGeral, setCatalogoGeral] = useState<any[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  const [novoNome, setNovoNome] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [novaUnidade, setNovaUnidade] = useState<'un' | 'kg' | 'g'>('un');
  const [novoPreco, setNovoPreco] = useState('');

  // 1. Escuta em tempo real o Carrinho Atual
  useEffect(() => {
    const q = query(collection(banco, 'carrinho_atual'), orderBy('adicionadoEm', 'desc'));
    const cancelar = onSnapshot(q, (snapshot) => {
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
      setItensCarrinho(lista);
    });
    return () => cancelar();
  }, []);

  // 2. Carrega o catálogo geral apenas UMA VEZ ao abrir a página (economiza cota do Firebase)
  useEffect(() => {
    async function carregarCatalogo() {
      try {
        const snapshot = await getDocs(collection(banco, 'despensa')); // ou 'mercado' conforme sua base
        const lista: any[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          lista.push({ id: docSnap.id, ...d });
        });
        setCatalogoGeral(lista);
      } catch (err) {
        console.error('Erro ao carregar catálogo:', err);
      } finally {
        setCarregandoCatalogo(false);
      }
    }
    carregarCatalogo();
  }, []);

  // Filtro local instantâneo na memória (sem novas requisições ao Firestore)
  const resultadosBusca = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    if (!termo) return [];
    return catalogoGeral
      .filter((item) => (item.nome || '').toLowerCase().includes(termo))
      .slice(0, 15); // Limita a 15 resultados visuais para manter a interface limpa
  }, [catalogoGeral, termoBusca]);

  const itensModo = useMemo(() => itensCarrinho.filter((i) => i.modo === modo), [itensCarrinho, modo]);

  const totalBruto = useMemo(() => {
    return itensModo.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  }, [itensModo]);

  const dGlobalNum = parseFloat(descontoGlobal.replace(',', '.')) || 0;
  const totalGasto = Math.max(0, totalBruto - dGlobalNum);
  const saldo = teto - totalGasto;
  const percentual = teto > 0 ? Math.min((totalGasto / teto) * 100, 100) : 0;

  const adicionarAoCarrinhoDoBanco = async (prod: any) => {
    const qtd = prod.quantidade || 1;
    const preco = prod.precoUnitario || prod.ultimoPreco || 0;
    const unidade = prod.unidade || 'un';
    const subtotal = unidade === 'g' ? (qtd / 1000) * preco : qtd * preco;

    await addDoc(collection(banco, 'carrinho_atual'), {
      nome: prod.nome || 'Produto',
      quantidade: qtd,
      unidade,
      precoUnitario: preco,
      subtotal,
      modo,
      mercado: mercado || 'Não informado',
      adicionadoPor: usuario?.nome || 'Usuário',
      adicionadoEm: serverTimestamp(),
    });

    setTermoBusca('');
  };

  const adicionarManual = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoNome.trim()) return;

    setModalAberto(false);
    const qtd = parseFloat(novaQtd.replace(',', '.')) || 1;
    const preco = parseFloat(novoPreco.replace(',', '.')) || 0;
    const subtotal = novaUnidade === 'g' ? (qtd / 1000) * preco : qtd * preco;

    await addDoc(collection(banco, 'carrinho_atual'), {
      nome: novoNome.trim(),
      quantidade: qtd,
      unidade: novaUnidade,
      precoUnitario: preco,
      subtotal,
      modo,
      mercado: mercado || 'Não informado',
      adicionadoPor: usuario?.nome || 'Usuário',
      adicionadoEm: serverTimestamp(),
    });

    setNovoNome('');
    setNovaQtd('1');
    setNovoPreco('');
  };

  const limparCarrinho = async () => {
    if (!confirm('Deseja limpar todos os itens do carrinho atual?')) return;
    const lote = writeBatch(banco);
    itensModo.forEach((item) => {
      lote.delete(doc(banco, 'carrinho_atual', item.id));
    });
    await lote.commit();
  };

  const finalizarCompra = async () => {
    if (itensModo.length === 0) return;
    setSalvandoCompra(true);

    try {
      await addDoc(collection(banco, 'historico_compras'), {
        dataCompra,
        mercado: mercado.trim() || 'Mercado não informado',
        localizacao: localizacao.trim() || 'Localização não informada',
        tetoGasto: teto,
        totalBruto,
        descontoGlobal: dGlobalNum,
        totalGasto,
        modo,
        totalItens: itensModo.length,
        compradoPor: usuario?.nome || 'Usuário',
        finalizadoEm: serverTimestamp(),
        produtos: itensModo.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
          precoUnitario: i.precoUnitario,
          subtotal: i.subtotal,
        })),
      });

      const lote = writeBatch(banco);
      itensModo.forEach((item) => {
        lote.delete(doc(banco, 'carrinho_atual', item.id));
      });
      await lote.commit();

      alert('Compra guardada com sucesso no histórico!');
      setMercado('');
      setLocalizacao('');
      setDescontoGlobal('');
    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
      alert('Erro ao finalizar compra.');
    } finally {
      setSalvandoCompra(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="text-teal-600" />
          Mercado / Carrinho
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Busque produtos do banco de dados para adicionar ao seu carrinho e controlar sua compra.
        </p>
      </div>

      <div className="cartao-destaque bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between p-5 rounded-2xl shadow-lg">
        <div>
          <span className="text-teal-200 text-xs font-semibold uppercase tracking-wider">
            Total no Carrinho ({modo === 'rancho' ? 'Rancho' : 'Extras'})
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-0.5">
            {formatarMoeda(totalGasto)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-teal-700/60 text-teal-100 text-xs px-3 py-1 rounded-full font-medium">
            {itensModo.length} itens
          </span>
          {itensModo.length > 0 && (
            <button
              onClick={limparCarrinho}
              className="bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-xl text-xs transition-all"
              title="Limpar carrinho"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setModo('rancho')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'rancho' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
          }`}
        >
          Rancho (VR/VA)
        </button>
        <button
          onClick={() => setModo('extras')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'extras' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
          }`}
        >
          Gastos Extras
        </button>
      </div>

      <div className="relative">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">
          Buscar no banco de dados para colocar no carrinho:
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={carregandoCatalogo ? 'Carregando base de dados...' : 'Digite o nome do produto (ex: leite, arroz)...'}
            disabled={carregandoCatalogo}
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="campo-entrada pl-10"
          />
        </div>

        {termoBusca.trim() !== '' && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {resultadosBusca.length === 0 ? (
              <p className="p-3 text-xs text-slate-400 text-center">Nenhum produto encontrado com esse nome.</p>
            ) : (
              resultadosBusca.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => adicionarAoCarrinhoDoBanco(prod)}
                  className="flex items-center justify-between p-3 hover:bg-teal-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{prod.nome}</p>
                    <p className="text-xs text-slate-400">
                      {prod.quantidade || 1} {prod.unidade || 'un'} — {formatarMoeda(prod.precoUnitario || prod.ultimoPreco || 0)}
                    </p>
                  </div>
                  <button className="text-teal-600 dark:text-teal-400 flex items-center gap-1 text-xs font-bold">
                    <PlusCircle size={16} /> Adicionar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setModalAberto(true)} className="botao-primario">
          <Plus size={18} /> Adicionar Item Manual
        </button>

        <button
          onClick={finalizarCompra}
          disabled={salvandoCompra || itensModo.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {salvandoCompra ? 'Salvando...' : 'Finalizar e Guardar Compra'}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Itens no Carrinho ({itensModo.length})
        </h2>
        {itensModo.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <p>Nenhum produto no carrinho no momento.</p>
            <p className="text-xs mt-1">Use a barra de pesquisa acima para buscar do banco ou clique em "Adicionar Item Manual".</p>
          </div>
        ) : (
          itensModo.map((item) => <ItemCarrinhoCard key={item.id} item={item} />)
        )}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Adicionar Item Manual">
        <form onSubmit={adicionarManual} className="space-y-4">
          <div>
            <label className="rotulo">Nome do produto</label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="campo-entrada"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Quantidade</label>
              <input
                type="text"
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
            <label className="rotulo">Preço Unitário (R$)</label>
            <input
              type="text"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              className="campo-entrada"
            />
          </div>
          <button type="submit" className="botao-primario w-full">
            Adicionar ao Carrinho
          </button>
        </form>
      </Modal>
    </div>
  );
}
